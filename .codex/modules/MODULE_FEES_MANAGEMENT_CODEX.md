# Learning Is Fun ERP
## Codex Implementation Prompt
### Fees Management Module

Implement a real operational **Fees Management** module in the existing `learning-is-fun` repository.

Do not start Examinations. Preserve all existing Attendance, Learning Planner, Practice Work, Student Dashboard, Dashboard/Navigation Rework, Authentication, Students, Masters, Fee Heads, and Payment Modes behavior. Do not commit or push unless explicitly instructed.

## Current live database facts to preserve

The live Supabase project already contains these fee-related tables:

### `fee_heads`
- `id`
- `institute_id`
- `name`
- `code`
- `category`
- `display_order`
- `is_active`
- `created_at`
- `updated_at`

### `payment_modes`
- `id`
- `institute_id`
- `name`
- `display_order`
- `is_active`
- `created_at`
- `updated_at`

### `student_fee_assignments`
- `id`
- `student_id`
- `academic_year_id`
- `fee_head_id`
- `amount`
- `discount_type`
- `discount_value`
- `effective_from`
- `effective_to`
- `is_active`
- `created_at`
- `updated_at`

Important schema/security facts:

- `fee_heads` currently has RLS disabled.
- `payment_modes` already has RLS enabled.
- `student_fee_assignments` currently has RLS disabled.
- `student_fee_assignments` does not currently contain an `institute_id`; tenant ownership must therefore be derived safely through its linked Student / Academic Year / Fee Head relationships unless a migration intentionally and safely introduces tenant redundancy with proper backfill and constraints.

Do not duplicate these tables or create parallel `fee_head` / `payment_mode` concepts.

## Primary business goals

The Fees module must support:

1. Assigning fee heads and amounts to Students for an Academic Year.
2. Optional discounts per fee assignment.
3. One-time or installment-based dues.
4. Due dates.
5. Full or partial payments.
6. Multiple payment modes.
7. Automatic allocation of a payment to selected dues/fee heads.
8. Accurate outstanding balance.
9. Receipt generation and immutable receipt numbering.
10. Payment history.
11. Student fee ledger / statement.
12. Administrator collection dashboard.
13. Student self-view of fees/receipts.
14. Parent linked-child fee visibility when Parent portal work is later enabled.
15. Strong institute isolation and Student/Parent read isolation.
16. Cancellation/reversal workflow without deleting financial history.

## Financial integrity rules

This module handles money. Do not implement balances only in Client Components.

All authoritative payment, allocation, outstanding-balance, receipt, reversal, and status calculations must be enforced server-side and preferably atomically in PostgreSQL RPCs/transactions.

Do not hard-delete posted payments or receipts.

Use reversal/cancellation records or status transitions that preserve audit history.

Never allow payment allocation greater than the remaining due amount.

Never allow a negative payment, negative fee amount, invalid discount, or mathematically negative net fee.

All currency values must use PostgreSQL `numeric`, not floating-point types.

## Existing fee-assignment model

Reuse `student_fee_assignments` as the authoritative assignment of a Fee Head amount to a Student and Academic Year.

The existing fields must remain meaningful:

- `amount` = gross assigned amount for that fee head.
- `discount_type` = optional discount method.
- `discount_value` = optional discount value.
- `effective_from` / `effective_to` = applicability period.
- `is_active` = whether the assignment remains active.

Normalize discount behavior.

Recommended supported values:

- `null` / no discount
- `fixed`
- `percentage`

Validate:

- fixed discount >= 0 and <= gross amount;
- percentage >= 0 and <= 100;
- net assigned amount >= 0.

Do not silently change the meaning of historical assignments.

## New operational database model

Inspect the current schema, constraints, triggers, indexes, RLS conventions, Student assignment architecture, and audit patterns first.

Add the smallest reliable set of operational tables required. A recommended design is below, but adapt names/constraints to repository conventions if a better existing pattern is present.

### 1. `student_fee_dues`

Represents payable installments/due lines generated from `student_fee_assignments`.

Recommended fields:

- `id uuid primary key`
- `institute_id uuid not null`
- `student_fee_assignment_id uuid not null`
- `student_id uuid not null`
- `academic_year_id uuid not null`
- `fee_head_id uuid not null`
- `installment_no integer not null`
- `due_date date null`
- `gross_amount numeric not null`
- `discount_amount numeric not null default 0`
- `net_amount numeric not null`
- `status text not null`
- `created_at timestamptz`
- `updated_at timestamptz`

Recommended status values:

- `due`
- `partially_paid`
- `paid`
- `waived`
- `cancelled`

Enforce tenant-safe composite FKs where the existing schema supports them.

Prevent duplicate generation for the same assignment/installment number.

### 2. `fee_payments`

Represents a posted payment transaction.

Recommended fields:

- `id uuid primary key`
- `institute_id uuid not null`
- `student_id uuid not null`
- `academic_year_id uuid not null`
- `payment_date timestamptz not null`
- `amount numeric not null`
- `payment_mode_id uuid not null`
- `reference_no text null`
- `remarks text null`
- `status text not null`
- `receipt_no text not null`
- `received_by uuid not null`
- `created_at timestamptz`
- `reversed_at timestamptz null`
- `reversed_by uuid null`
- `reversal_reason text null`

Recommended statuses:

- `posted`
- `reversed`

`receipt_no` must be immutable after posting.

### 3. `fee_payment_allocations`

Links each payment to one or more dues.

Recommended fields:

- `id uuid primary key`
- `institute_id uuid not null`
- `fee_payment_id uuid not null`
- `student_fee_due_id uuid not null`
- `amount numeric not null`
- `created_at timestamptz`

Enforce:

- allocation amount > 0;
- a payment only allocates to dues for the same Student, Academic Year and institute;
- total allocations = payment amount for a posted payment;
- allocated amount never exceeds the outstanding amount of a due.

### Optional 4. `fee_receipt_sequences`

Only create this if needed to generate concurrency-safe receipt numbers.

If an existing sequence/counter pattern exists, reuse it.

Receipt numbers should be deterministic and unique within institute/year according to a documented format such as:

`LIF/2026-27/000123`

Do not rely on `max(receipt_no)+1` without locking/concurrency safety.

## Installment / due generation

The Administrator must be able to assign fees in either:

- One-time mode
- Installment mode

Recommended UI:

`Fees -> Student Fees -> Assign Fees`

Select:

- Academic Year
- Student (or Batch if batch assignment is intentionally implemented)
- Fee Head
- Gross Amount
- Discount Type
- Discount Value
- Payment Schedule

Payment schedule choices:

- One Time
- Monthly
- Quarterly
- Custom Installments

For custom installments allow Administrator to define installment amount + due date rows.

Do not require complex recurring automation for v1. Generate concrete `student_fee_dues` rows when the fee assignment/schedule is confirmed.

The sum of generated net due rows must exactly equal the net assigned fee amount.

If modifying an assignment after payments exist would invalidate financial history, block destructive edits and require an explicit adjustment/reversal workflow instead.

## Fee collection workflow

Create an Administrator route such as:

`/fees/collect`

Workflow:

1. Search/select Student.
2. Select Academic Year.
3. Display outstanding dues grouped by Fee Head and due date.
4. Show:
   - gross amount
   - discount
   - net due
   - already paid
   - outstanding
   - due date
   - status
5. Administrator selects one or more dues.
6. Enter collection amount.
7. Select Payment Mode.
8. Optional reference number/remarks.
9. Preview allocation.
10. Post Payment.
11. Database transaction creates:
    - `fee_payments`
    - `fee_payment_allocations`
    - receipt number
    - due status updates
12. Display receipt.

Support partial payments.

For v1, allocation can be explicit based on dues selected by Administrator, or oldest-due-first if the UI clearly shows and confirms the calculated allocation.

Never silently allocate to another Student or another Academic Year.

## Atomic RPCs

Prefer database RPCs for financial operations.

Recommended operations:

### `generate_student_fee_dues(...)`

Validates assignment ownership, discount, schedule totals and creates due rows idempotently.

### `post_fee_payment(...)`

Must atomically:

- authenticate active Administrator;
- derive institute from authenticated profile;
- validate Student and Academic Year scope;
- lock relevant due rows;
- validate outstanding balances;
- validate active Payment Mode belongs to institute;
- generate concurrency-safe receipt number;
- create payment;
- create allocations;
- verify allocation total equals payment total;
- recalculate due statuses;
- return payment/receipt details.

### `reverse_fee_payment(...)`

Must atomically:

- require Administrator;
- require reversal reason;
- reject already reversed payment;
- preserve original payment and receipt;
- mark payment reversed;
- make its allocations non-effective through status logic or explicit reversal records;
- restore due outstanding/status correctly;
- audit who reversed and when.

Do not delete allocation rows just to reverse a payment unless an immutable compensating mechanism preserves the full audit trail.

### Read helpers/RPCs where useful

- Student fee summary
- Student fee ledger
- Outstanding dues
- Daily collection summary

## Authoritative balance formula

For each due:

`Outstanding = Net Due - Effective Posted Allocations`

where allocations linked to reversed payments do not count.

Aggregate Student balance:

`Total Outstanding = Sum of outstanding dues`

Do not persist redundant balance columns unless there is a compelling audited reason. Prefer authoritative derivation from dues and effective allocations.

## Receipt

Create a printable receipt page such as:

`/fees/receipts/[paymentId]`

Receipt should include:

- Institute name
- Receipt number
- Payment date
- Student name
- Academic Year
- Fee Heads / due allocations
- Gross/net relevant amounts
- Amount received
- Payment mode
- Reference number when present
- Received by
- Remarks
- Payment status

For a reversed payment, receipt/detail page must clearly show `REVERSED` and the reversal reason/date.

Do not mutate or reuse a reversed receipt number.

A PDF export can be deferred unless an existing PDF mechanism is already available and easy to reuse.

## Administrator Fees routes

Implement a coherent operational route group, recommended:

- `/fees` — Fees Dashboard
- `/fees/student-fees` — Student fee assignments / balances
- `/fees/collect` — Collect Payment
- `/fees/payments` — Payment history
- `/fees/receipts/[paymentId]` — Receipt detail/print view
- `/fees/reports` — Basic collection/outstanding reports

Reuse Masters:

- `/masters/fee-heads`
- `/masters/payment-modes`

Do not duplicate Fee Heads or Payment Modes inside the Fees module.

## Fees Dashboard

Use live data only.

Useful cards:

- Total Outstanding
- Collections Today
- Collections This Month
- Students With Outstanding Fees

Useful panels:

- Recent Payments
- Overdue Dues
- Quick Actions

Quick Actions:

- Collect Fee
- Student Fees
- Payment History
- Fee Heads
- Payment Modes

No placeholder values.

If there is no data, show honest zero/empty states.

## Student Fees page

Administrator should be able to:

- search Student;
- filter Academic Year;
- view assigned Fee Heads;
- view discounts;
- view installment schedule;
- view paid amount;
- view outstanding amount;
- assign/add a Fee Head;
- generate or review dues;
- inspect ledger/payment history.

Do not allow arbitrary edits to a paid historical due that would break reconciliation.

## Payment History

Provide filters:

- date range
- Student
- Payment Mode
- status (`posted`, `reversed`)
- receipt number/reference search

Columns:

- Receipt No
- Date
- Student
- Amount
- Payment Mode
- Reference
- Status
- Received By

Actions:

- View Receipt
- Reverse (Administrator only, posted payments only)

## Reports v1

Implement practical initial reports, not a large analytics project.

### Collection Report

Filters:

- date range
- Payment Mode

Totals:

- total collections
- payment count
- breakdown by Payment Mode

Exclude reversed payments from effective collection totals, while still allowing them to appear in transaction history.

### Outstanding Report

Filters:

- Academic Year
- Student / Batch if available
- Fee Head
- overdue only

Show:

- Student
- Fee Head
- Due Date
- Net Due
- Paid
- Outstanding
- Status

## Student portal integration

Now that the Student Dashboard exists, add Student-facing fee read routes if security is implemented safely:

Recommended:

- `/student/fees`

Student can view only:

- own assignments/dues
- own paid/outstanding summary
- own payments
- own receipts

Student cannot:

- assign fees
- modify dues
- post payments
- reverse payments
- view other Students

Add `My Fees` to Student navigation only once the route exists and passes authorization/RLS tests.

## Parent access

There is currently no full Parent dashboard.

Implement database/RLS readiness for linked-parent read access only if it can be done cleanly with existing `parents` + `student_parent_links` architecture.

Do not create a fake Parent UI as part of this module.

When Parent Dashboard is implemented later, it should be able to expose linked child fee data without changing the financial model.

## RLS and tenant safety

This module must harden existing fee tables as part of the implementation.

### `fee_heads`

Currently RLS is disabled. Enable RLS and add institute-scoped policies consistent with current Administrator roles.

### `student_fee_assignments`

Currently RLS is disabled. Enable RLS and add safe policies.

Administrator access must be institute-scoped through the linked Student / Academic Year / Fee Head ownership.

Student SELECT must be own-record only.

Parent SELECT, if added now, must require a valid linked-child relation.

Do not grant Student/Parent INSERT/UPDATE/DELETE.

### New financial tables

Enable RLS on all new tables.

Administrator access:

- active Administrator roles only;
- same institute only.

Student access:

- read own dues/payments/allocations/receipts only where exposing allocation rows is safe;
- no financial mutations.

Parent access:

- linked-child read only if implemented.

Anonymous access must be denied.

Remember: UI hiding is not authorization.

## Security-definer rules

If financial RPCs are `SECURITY DEFINER`:

- set a safe explicit `search_path`;
- validate `auth.uid()` internally;
- validate active profile and Administrator role;
- derive institute server-side;
- validate all record ownership inside RPC;
- revoke execute from `PUBLIC` and `anon`;
- grant only to `authenticated` where required.

## Auditability

Record at minimum:

- payment creator/receiver
- created timestamp
- reversal actor/time/reason
- immutable receipt number

If an existing audit-log pattern exists, reuse it rather than creating a parallel generic audit framework.

## Navigation integration

After real `/fees` routes exist, update production navigation so Fees becomes a true operational group.

Administrator recommended group:

### Fees
- Overview
- Student Fees
- Collect Payment
- Payment History
- Reports

Keep `Fee Heads` and `Payment Modes` under Academic Setup or Fee Configuration, whichever matches the current navigation cleanup.

Student navigation:

- add `My Fees` only when `/student/fees` is implemented and tested.

Do not reintroduce generic Finance placeholders.

## Administrator Dashboard integration

Update the recently reworked Administrator dashboard only after the Fees module has real live data.

Replace the limited `Active Fee Heads`-only emphasis with useful financial information such as:

- Collections Today
- Total Outstanding

But preserve dashboard performance.

Prefer small aggregate queries/RPCs rather than loading full payment datasets.

Do not break the existing Dashboard/Navigation Rework.

## Existing dashboard runtime fix prerequisite

There is a known uncommitted Dashboard/Recent Activity query fix around `schedule_changes.institute_id`.

Preserve that fix and all current uncommitted Dashboard + Navigation work.

Do not overwrite, reset, or discard it while implementing Fees.

The Fees module must not introduce or hide unrelated dashboard errors.

## Service / application architecture

Follow existing project patterns:

- `features/fees/types/`
- `features/fees/schemas/`
- `features/fees/services/` (server-only)
- `features/fees/actions/`
- `features/fees/components/`
- `app/(protected)/fees/...`

Use Server Components for reads where appropriate and Server Actions for Administrator form mutations.

Use Zod for input validation.

Do not expose privileged Supabase service-role credentials to the browser.

## Suggested typed domain concepts

- `StudentFeeAssignment`
- `StudentFeeDue`
- `FeePayment`
- `FeePaymentAllocation`
- `FeeReceipt`
- `StudentFeeSummary`
- `FeeCollectionSummary`
- `OutstandingFeeRow`

## UI/UX requirements

- responsive desktop/mobile
- clear currency formatting (INR by default if the existing institute configuration has no currency field)
- searchable Student selectors
- clear outstanding vs paid status
- overdue badges
- partial-payment clarity
- confirmation before posting payment
- explicit confirmation + reason before reversal
- printable receipt layout
- loading states
- empty states
- error states
- no placeholder financial figures
- stable React keys

Do not hardcode Indian Rupee symbol deep in calculations; formatting should be presentation-level. If no configurable currency exists, use INR formatting for v1 and document it.

## Currency/time behavior

Financial dates/times should use the project/institute timezone conventions. The current operating timezone is Asia/Kolkata unless the application already has an institute-specific timezone.

Use date-only due dates and timestamptz payment timestamps.

## Database migration requirements

Create a new forward migration; never edit already-applied historical migrations.

Create a matching rollback SQL file.

Create transactional SQL tests.

Migration should include:

- new financial tables/constraints/indexes
- receipt-number mechanism
- RLS hardening for `fee_heads` and `student_fee_assignments`
- RLS for new tables
- required RPCs
- grants/revokes
- comments where useful

Rollback must be safe and validated in a transaction.

## Required SQL tests

At minimum test:

1. Administrator can access only own institute fee data.
2. Cross-institute fee assignment is rejected.
3. Invalid discounts are rejected.
4. Due generation totals exactly equal net assignment amount.
5. Due generation is duplicate-safe/idempotent.
6. Partial payment works.
7. Full payment works.
8. Multi-due payment allocation works.
9. Allocation above outstanding amount is rejected.
10. Allocation total differing from payment amount is rejected.
11. Payment Mode from another institute is rejected.
12. Receipt number is unique/concurrency-safe.
13. Reversal restores effective outstanding correctly.
14. Reversed payment no longer contributes to effective collection totals.
15. Original payment/receipt history remains present after reversal.
16. Student sees only own fee data.
17. Student cannot post/reverse payments.
18. Parent linked-child isolation if Parent read policies are implemented.
19. Unrelated Parent/Student cannot view data.
20. Anonymous access/execution is denied.
21. No negative balances after valid operations.

Use transactional smoke data and roll it back/clean it up.

## Application verification

Run:

- `npm.cmd run lint`
- `npx.cmd next typegen`
- `npx.cmd tsc --noEmit`
- `npm.cmd run build`
- `git diff --check`

Perform a route/link audit for all newly exposed Fees navigation.

## Browser smoke test

If authenticated browser interaction is available, test Administrator workflow:

1. Open `/fees`.
2. Assign a Fee Head to a Student.
3. Generate one or more dues.
4. Collect a partial payment.
5. Verify remaining outstanding.
6. Collect remaining payment.
7. Verify due becomes paid.
8. Open receipt.
9. Verify payment history.
10. Reverse a safe test payment.
11. Verify receipt remains visible as reversed.
12. Verify outstanding is restored.
13. Test filters/reports.
14. Test responsive layout and console.

Student workflow:

1. Open `/student/fees`.
2. Verify only own data.
3. Verify own receipt access.
4. Attempt direct Administrator fee route and confirm rejection/redirect.

If browser automation is unavailable, explicitly distinguish database/service tests from unperformed UI tests.

## No fake payment gateway work

Do not integrate Razorpay, Stripe, UPI APIs, online gateways, WhatsApp receipts, or automatic bank reconciliation in this module unless explicitly requested later.

For now, Payment Mode records represent how an Administrator records the payment (Cash, UPI, Bank Transfer, etc.).

Online payment gateway integration can be a later phase.

## No destructive rewrites

Do not reset, truncate, or redesign existing Student/Masters data.

Do not delete `student_fee_assignments` just because the new model adds dues/payments.

Migrate forward around it.

## Required final report

Report:

1. Repository/schema findings.
2. Existing fee tables reused.
3. New tables created.
4. Existing tables hardened/altered.
5. Migration file.
6. Rollback file.
7. SQL test file.
8. RLS policies added/changed.
9. RPCs created.
10. Receipt-number strategy.
11. Fee assignment workflow.
12. Installment/due workflow.
13. Collection/partial-payment workflow.
14. Reversal workflow.
15. Student fee access.
16. Parent-read readiness/status.
17. Administrator routes.
18. Student routes.
19. Navigation changes.
20. Dashboard integration.
21. Files created/modified/deleted.
22. Database verification results.
23. Lint/type/build/diff-check results.
24. Browser tests completed/deferred.
25. Any remaining risks or deferred work.
26. Confirmation no Examination functionality was added.
27. Confirmation existing Attendance/Learning Planner/Practice Work/Student Dashboard business logic was preserved.
28. `git status -sb`.

Do not commit or push.
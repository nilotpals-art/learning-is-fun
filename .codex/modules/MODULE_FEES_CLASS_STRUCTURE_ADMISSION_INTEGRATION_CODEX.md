# Learning Is Fun ERP
## Codex Implementation Prompt
### Fees: Class-wise Fee Structure + Admission Integration

Implement this as a focused enhancement to the existing Fees Management module.

Preserve all existing Fees accounting, Attendance, Learning Planner, Practice Work, Student Dashboard, Dashboard/Navigation, Authentication, Students, Masters, and RLS behavior. Do not start Examinations. Do not commit or push unless explicitly instructed.

## Goals

1. Allow Administrator to define class-wise fee structures for each Academic Year.
2. Automatically fetch the applicable fee structure during Student admission after Academic Year + Class are selected.
3. Let Administrator review and adjust permitted fields before confirming the Student’s fee assignments.
4. Support Security Deposit as a first-class fee concept, preferably through Fee Head classification.
5. Create actual Student fee assignments/dues through the existing server-authoritative Fees RPC/service layer, not by duplicating financial logic in the admission form.

## Class Fee Structure Model

Inspect existing schema and conventions first. Add the smallest safe model, recommended:

### `class_fee_structures`
- id uuid primary key
- institute_id uuid not null
- academic_year_id uuid not null
- class_id uuid not null
- branch_id uuid null if branch-specific fees are needed
- board_id uuid null only if board-specific fees are actually required by current schema/workflow
- name text not null
- is_active boolean not null default true
- created_at timestamptz
- updated_at timestamptz
- created_by uuid
- updated_by uuid null

Enforce institute-safe FKs and uniqueness for active structures so accidental duplicates are prevented.

### `class_fee_structure_items`
- id uuid primary key
- institute_id uuid not null
- class_fee_structure_id uuid not null
- fee_head_id uuid not null
- amount numeric(12,2) not null
- is_mandatory boolean not null default true
- default_discount_type text null
- default_discount_value numeric null
- schedule_type text not null
- display_order integer not null
- created_at timestamptz
- updated_at timestamptz

Recommended `schedule_type` values:
- one_time
- monthly
- quarterly
- custom

If custom/installment rows need durable defaults, add a child table such as `class_fee_structure_installments` with installment_no, due-date rule/date, gross amount/percentage, discount amount/percentage where appropriate. Keep the model simple and auditable.

## Fee Head Classification / Security Deposit

Extend `fee_heads` only if needed and safe.

Recommended new field:

`fee_nature text not null default 'regular'`

Allowed values:
- regular
- one_time
- refundable_deposit

Security Deposit should be represented as a normal Fee Head with `fee_nature='refundable_deposit'`, not as a separate parallel money system.

Do not yet implement deposit refund accounting unless the current scope already has a safe adjustment/refund mechanism. Instead, ensure the classification is preserved so a future refundable-deposit workflow can distinguish it from ordinary fees.

## Administrator UI

Add a real route group such as:

- `/fees/structures` — list/search structures
- `/fees/structures/new` — create structure if routing conventions support it
- `/fees/structures/[id]` — view/edit structure

Or implement equivalent dialogs inside `/fees/structures` if that matches the existing application architecture.

The Administrator should be able to:
- select Academic Year
- select Class
- optionally select Branch only if needed by current architecture
- add Fee Heads
- set amount per Fee Head
- mark each item mandatory/optional
- classify/default schedule
- define one-time/monthly/quarterly/custom installment behavior
- set default discount only if desired
- activate/deactivate a structure

Do not allow destructive edits to a structure to retroactively mutate existing Student financial history.

Existing Student assignments/dues are snapshots/transactions and must not silently change when the class structure changes later.

## Admission Integration

Audit the existing Student admission/create route and server action before implementing.

During admission, after the Administrator chooses at minimum:
- Academic Year
- Class

fetch the active matching class fee structure.

Show a clear section in the Student admission form:

### Fee Structure

For each fee item display:
- Fee Head
- Fee Nature (regular / one-time / refundable deposit)
- Gross Amount
- Mandatory/Optional
- Default installment schedule
- Default due dates if applicable
- Discount controls where permitted
- Net Amount

Administrator actions before final confirmation:
- accept defaults
- exclude optional Fee Heads
- adjust an amount only if the business rules allow per-Student overrides
- apply Student-specific fixed/percentage discount
- edit permitted installment dates/amounts while preserving exact totals

Mandatory Fee Heads cannot be silently removed.

If no fee structure exists for the selected Academic Year/Class:
- do not crash admission;
- show `No fee structure configured for this class.`
- allow Student admission to continue if current business rules permit;
- clearly flag that Fees are not assigned yet.

## Financial Creation Flow

Do not insert directly into `student_fee_assignments` or `student_fee_dues` from a Client Component.

After the Student record exists and fee choices are confirmed, create the Student’s fees using the existing server-authoritative Fees assignment RPC/service.

Prefer a server-side orchestrator that:
1. validates active Administrator and institute
2. creates the Student through the existing Student service/action
3. resolves the selected class fee structure server-side again
4. validates the submitted fee snapshot against allowed structure items
5. creates each Student fee assignment and dues through the existing Fees RPC/service
6. returns a clear admission + fee-assignment result

Do not trust fee amounts or mandatory flags sent by the browser without server-side validation.

## Transaction / Failure Behavior

Do not create a confusing half-state silently.

If the existing Student creation architecture supports a single safe database transaction covering Student + fee assignment, use it only if it does not duplicate complex Student or Fees business logic.

Otherwise use an explicit orchestrated workflow with clear failure semantics:
- Student admission success must be reported independently from fee-assignment success.
- If Student creation succeeds but fee assignment fails, show a clear warning and provide a direct action to complete fee assignment from `/fees/student-fees`.
- Never delete a successfully admitted Student merely because a downstream Fees RPC failed unless the whole process is genuinely one atomic database transaction.

## Snapshot Integrity

Class fee structures are templates/defaults.

Once applied to a Student, the authoritative Student financial records are:
- `student_fee_assignments`
- `student_fee_dues`
- payments/allocations/receipts

Later edits to a class fee structure must not modify previously generated Student assignments or paid dues.

Provide an intentional “Apply updated structure” or “Add missing fee head” workflow later if needed; do not auto-rewrite historical Student fees.

## Existing Fees Compatibility

Preserve:
- Payment Mode validation
- partial/full payments
- allocations
- receipt numbering
- outstanding calculation
- reversals
- WhatsApp reminders/confirmation queueing
- Student/Parent read isolation
- Fees dashboard/reports

No existing posted payment, receipt, or allocation should be changed by this enhancement.

## Navigation

Add `Fee Structures` to the Administrator Fees group only after the route is implemented and verified.

Recommended Fees group:
- Overview
- Fee Structures
- Student Fees
- Collect Payment
- Payment History
- Reports
- WhatsApp Settings / Messages as already implemented

Keep Fee Heads and Payment Modes under Academic Setup/Fee Configuration.

## RLS / Security

Enable RLS on all new class-fee-structure tables.

Administrator only:
- SELECT/INSERT/UPDATE within own institute

Student/Parent:
- no direct class-structure mutation access
- direct SELECT is optional and usually unnecessary; admission/fees server services can use Administrator scope

Anonymous access denied.

If using SECURITY DEFINER RPCs:
- safe explicit search_path
- validate auth.uid()
- validate active Administrator role
- derive institute server-side
- revoke PUBLIC/anon
- grant only authenticated as needed

## Required Tests

Add forward migration, rollback, and SQL tests covering at minimum:

1. Structure institute isolation
2. Active structure uniqueness
3. Fee Head ownership validation
4. Class/Academic Year ownership validation
5. Amount > 0
6. Valid fee_nature
7. Mandatory vs optional behavior
8. Exact installment total validation
9. No anonymous access
10. Student/Parent cannot mutate structures
11. Applying a structure creates correct Student assignments and dues
12. Student-specific discount overrides validate correctly
13. Security Deposit carries `refundable_deposit` classification into the applied snapshot/context where relevant
14. Editing class structure later does not mutate existing Student assignments/dues
15. Existing payment/receipt/reversal flows still pass

## Application Verification

Run:

```powershell
npm.cmd run lint
npx.cmd next typegen
npx.cmd tsc --noEmit
npm.cmd run build
git diff --check
```

Also perform a route/link audit for the new Fee Structures route and admission integration.

If authenticated browser testing is available, smoke-test:
- create class fee structure
- include a refundable Security Deposit Fee Head
- start Student admission
- select Academic Year + Class
- confirm fee structure auto-loads
- adjust an optional item/discount
- complete admission
- verify Student fees/dues appear correctly
- verify existing Fees collection page can collect against those dues

## Important Constraints

- Do not duplicate Fee Heads.
- Do not create a separate Security Deposit payment system.
- Do not calculate authoritative fees only on the client.
- Do not silently rewrite existing Student financial history when a class structure changes.
- Do not weaken existing RLS.
- Do not start Examinations.
- Do not commit or push.

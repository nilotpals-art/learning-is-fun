# Learning Is Fun ERP

# Finance / Fees Phase

## Objective

Complete the full Fees and Finance workflow for Learning Is Fun ERP.

The Finance phase must remain:

* institute-scoped;
* student-scoped where applicable;
* academic-year aware;
* auditable;
* safe for financial records;
* compatible with the existing Supabase schema.

Do not invent tables, columns, or relationships.

Before every Finance module, inspect the live database first.

---

# Finance Module Order

## Module 03F – Fee Heads

Purpose:

Define reusable fee categories.

Current approved default Fee Heads:

* Tuition Fee
* Examination Fee
* Activity Fee
* Security Deposit
* Miscellaneous Fee

Current categories:

* Academic
* Examination
* Security Deposit
* Miscellaneous
* Other

Persist only fields supported by `public.fee_heads`.

Current known schema:

* id
* institute_id
* name
* code
* category
* display_order
* is_active
* created_at
* updated_at

Do not add:

* Amount
* Frequency
* Student assignment
* Refund transaction
* Payment transaction

Security Deposit business behavior belongs to later Finance modules.

---

## Module 03G – Payment Modes

Purpose:

Manage ways students can pay.

Possible examples:

* Cash
* UPI
* Bank Transfer
* Cheque

Before implementation inspect the live `payment_modes` schema.

Implement only actual persisted fields.

Required capabilities subject to schema:

* List
* View
* Create
* Edit
* Search
* Active/Inactive if supported

Payment Modes must remain independent of Fee Heads.

---

# Module F01 – Student Fee Assignment

Purpose:

Assign fees to an individual student for an Academic Year.

Inspect the existing:

`public.student_fee_assignments`

before implementation.

Known existing fields include concepts such as:

* student_id
* academic_year_id
* fee_head_id
* amount
* discount_type
* discount_value
* effective dates
* active status

Use the live schema as the source of truth.

## Requirements

Administrator should be able to:

* Select Student
* Select Academic Year
* Select Fee Head
* Enter Amount
* Apply discount only if supported
* Set effective dates where supported
* Activate/deactivate assignment where supported
* View assigned fees
* Edit assignment

Every referenced Student, Academic Year, and Fee Head must belong to the authenticated institute.

Never trust foreign-key IDs from the browser without server-side ownership verification.

Do not implement payment collection in this module.

---

# Module F02 – Student Fee Ledger

Purpose:

Provide one consolidated view of a student's financial position.

Before implementation inspect whether an appropriate ledger/payment table already exists.

The ledger should eventually show:

* Assigned Charges
* Discounts
* Payments
* Adjustments
* Refunds
* Outstanding Balance

Do not create a ledger table unless approved.

If these values can safely be calculated from transaction tables, prefer a calculated ledger.

---

# Module F03 – Fee Collection

Purpose:

Record student payments.

Before implementation inspect the live database for:

* payments
* fee_payments
* student_payments
* fee_collections
* receipts
* transaction tables

Do not assume table names.

## Expected workflow

Administrator:

1. Selects Student.
2. Selects Academic Year.
3. Views outstanding fees.
4. Selects fee(s) being paid.
5. Enters amount received.
6. Selects Payment Mode.
7. Records transaction reference where applicable.
8. Confirms payment.
9. Receives a generated receipt.

Support partial payments only if the schema can record them safely.

Never overwrite previous financial transactions.

Financial transactions should be append-only wherever possible.

---

# Module F04 – Receipt

Purpose:

Generate a permanent receipt for every successful fee payment.

Before implementation inspect whether receipts already have a dedicated table or identifiers.

Receipt should eventually include:

* Institute Name
* Student Name
* Student ID / Admission Number
* Academic Year
* Receipt Number
* Payment Date
* Fee Head(s)
* Amount
* Payment Mode
* Transaction Reference
* Total Paid
* Outstanding Balance
* Collected By

Requirements:

* Unique receipt number.
* Printable layout.
* PDF generation only when an appropriate implementation is approved.
* Existing receipts must not change if master data changes later.

Do not invent a receipt-number strategy without checking the schema.

---

# Module F05 – Security Deposit

Purpose:

Track refundable student security deposits separately from normal fee income.

The Fee Head named:

Security Deposit

identifies the transaction category.

Security Deposit must support future:

* Collection
* Remaining Balance
* Adjustment
* Refund

Do not assume that `fee_heads` itself should store the student's deposit balance.

Student-level Security Deposit history belongs in transaction/assignment records.

---

# Security Deposit Business Rules

Security Deposit is refundable.

When a student leaves or a refund is requested:

1. Calculate original deposit collected.
2. Calculate previous deposit adjustments.
3. Calculate previous deposit refunds.
4. Calculate remaining deposit balance.
5. Check outstanding eligible student fees.
6. Allow authorized adjustment against outstanding fees.
7. Refund any remaining approved balance.

Example:

Security Deposit collected:

₹5,000

Outstanding Tuition:

₹2,000

Adjustment:

₹2,000

Refund:

₹3,000

Remaining Deposit Balance:

₹0

Never modify the original deposit payment transaction.

Adjustment and refund must be separate financial transactions.

---

# Module F06 – Fee Adjustment

Purpose:

Allow authorized financial adjustments.

Examples:

* Security Deposit adjusted against unpaid Tuition Fee
* Administrative correction
* Approved fee waiver where supported

Every adjustment must record:

* Student
* Academic Year where applicable
* Source
* Target
* Amount
* Date
* Reason
* Authorized User

Do not implement adjustments by editing or deleting original transactions.

---

# Module F07 – Refunds

Purpose:

Record money returned to students/parents.

Typical use:

Security Deposit refund.

Refund requirements:

* Student
* Source transaction/deposit
* Refund amount
* Date
* Payment/refund mode
* Reference
* Reason
* Authorized By

Rules:

* Refund cannot exceed available refundable balance.
* Refund must not delete or alter original payment.
* Refund must produce an auditable transaction.
* Duplicate refund processing must be prevented.

---

# Module F08 – Outstanding Fees

Purpose:

Show student fee dues.

Provide:

* Student
* Academic Year
* Assigned Amount
* Discount
* Paid
* Adjustment
* Refund where relevant
* Outstanding

Support:

* Search
* Student filter
* Academic Year filter
* Fee Head filter
* Outstanding-only filter

Do not persist calculated balances unnecessarily if they can safely be derived.

---

# Module F09 – Finance Dashboard

Replace current Dashboard fee placeholders with real information only after supporting modules exist.

Possible metrics:

* Fees Collected Today
* Fees Collected This Month
* Outstanding Fees
* Security Deposits Held
* Refunds This Month
* Recent Payments

Never display fake production statistics.

---

# Module F10 – Finance Reports

Reports may include:

* Student Fee Statement
* Daily Collection Report
* Monthly Collection Report
* Outstanding Fees Report
* Fee Head Collection Report
* Payment Mode Report
* Security Deposit Report
* Refund Report
* Adjustment Report

Reports must be institute-scoped.

---

# Security Requirements

Every Finance operation must verify:

* authenticated session;
* active profile;
* administrator/authorized finance role;
* institute ownership;
* student ownership;
* academic-year ownership;
* Fee Head ownership;
* Payment Mode ownership.

Never rely only on Client Component authorization.

Never use user-controlled institute IDs.

Never expose service-role credentials to the browser.

---

# Financial Data Integrity

Financial history must be auditable.

Prefer:

* immutable payments;
* separate refunds;
* separate adjustments;
* permanent receipt references.

Avoid:

* deleting completed payments;
* silently rewriting historical payments;
* recalculating historic receipts from current master data;
* altering transaction history to correct mistakes.

Corrections should normally create compensating transactions.

---

# Database Rule

Before every module:

1. Inspect live Supabase tables.
2. Inspect foreign keys.
3. Inspect delete behavior.
4. Inspect uniqueness.
5. Inspect existing rows.
6. Inspect RLS.
7. Inspect grants.
8. Inspect existing project implementation.

If required database infrastructure does not exist:

STOP.

Provide:

* schema gap;
* recommended minimal migration;
* migration SQL;
* rollback SQL;
* impact analysis.

Wait for approval.

Do not create a workaround that compromises financial integrity.

---

# Development Pattern

Reuse the established ERP architecture:

* Server Components
* Server Actions
* Server-only services
* Zod
* React Hook Form
* Typed action results
* Responsive UI
* Institute scoping
* Toast feedback
* Loading/empty/error states

Do not create a generic Finance engine prematurely.

---

# Verification

Every Finance module must run:

* npm.cmd run lint
* npx.cmd tsc --noEmit
* npm.cmd run build
* git diff --check

Perform manual authenticated browser testing before commit.

Do not commit or push until explicitly approved.

---

# Finance Phase Definition of Done

The Finance phase is complete when:

* Fee Heads work.
* Payment Modes work.
* Student fees can be assigned.
* Payments can be collected.
* Receipts can be generated.
* Outstanding balances are correct.
* Security Deposits are tracked.
* Deposit adjustments are auditable.
* Refunds are auditable.
* Finance reports work.
* No historical transactions are silently mutated.
* Institute isolation is enforced.
* Build, TypeScript, lint, and regression checks pass.

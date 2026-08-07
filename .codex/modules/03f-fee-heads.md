# Module 03F – Fee Heads

## Status

Approved for Implementation

---

# Objective

Implement the Fee Heads master module for Learning Is Fun ERP.

Fee Heads define reusable categories under which student fees may later be assigned and collected.

This module is a Master Data module only.

It must not contain student-specific billing, payment, refund, deposit-balance, or adjustment logic.

The live Supabase schema is the source of truth.

---

# Live Database Table

Use:

`public.fee_heads`

Existing persisted fields:

* `id`
* `institute_id`
* `name`
* `code`
* `category`
* `display_order`
* `is_active`
* `created_at`
* `updated_at`

Do not add database fields in this module.

---

# User Access

Administrator only.

Student and Parent users must not have access to Fee Head administration.

---

# Institute Scoping

Fee Heads belong to an institute.

Every operation must:

* derive `institute_id` from the authenticated server-side profile;
* never accept `institute_id` from browser input;
* list only records belonging to the authenticated institute;
* scope View/Edit operations by both Fee Head ID and institute ID.

Cross-institute access must fail.

---

# Functional Requirements

Support:

* List Fee Heads
* View Fee Head
* Create Fee Head
* Edit Fee Head
* Search
* Category filtering
* Active / Inactive filtering

Do not implement hard delete.

Active status may be changed through Create/Edit.

---

# Fields

## Fee Head Name

Required.

Examples:

* Tuition Fee
* Examination Fee
* Activity Fee
* Security Deposit
* Miscellaneous Fee

Validation:

* Required
* Trim whitespace
* Cannot be whitespace-only
* Case-insensitive duplicate checking within the same institute

---

# Code

Required.

Examples:

* `TUI`
* `EXM`
* `ACT`
* `SEC`
* `MSC`

Validation:

* Required
* Trim whitespace
* Cannot be whitespace-only
* Normalize consistently
* Prefer uppercase
* Case-insensitive duplicate checking within the same institute

The database already enforces institute-scoped uniqueness for Code.

---

# Category

Required.

Application-level category choices:

* Academic
* Examination
* Security Deposit
* Miscellaneous
* Other

If `Other` is selected:

* Display a required Custom Category field.
* Trim the custom value.
* Save the custom value into the existing `category` column.

Do not add a new database column for custom categories.

---

# Display Order

Required.

Rules:

* Integer
* Minimum value: `1`
* Default value: `1`

Use Display Order to control predictable Fee Head presentation where applicable.

---

# Active Status

Required boolean.

Values:

* Active
* Inactive

Use Active/Inactive badges in the list.

No separate activation workflow is required unless implementation clearly benefits from it.

---

# Approved Initial Fee Heads

These are recommended setup values only.

Do NOT automatically insert or seed these records.

Administrators will create them manually.

| Fee Head          | Code | Category         |
| ----------------- | ---- | ---------------- |
| Tuition Fee       | TUI  | Academic         |
| Examination Fee   | EXM  | Examination      |
| Activity Fee      | ACT  | Academic         |
| Security Deposit  | SEC  | Security Deposit |
| Miscellaneous Fee | MSC  | Miscellaneous    |

---

# Examination Fee

Examination Fee is a normal Fee Head.

Recommended setup:

* Name: Examination Fee
* Code: EXM
* Category: Examination

Do not implement:

* Exam selection
* Exam-specific amounts
* Exam billing schedules
* Student exam charges

Those belong to later Finance/Examination integration modules.

---

# Security Deposit

Security Deposit is identified in this module only as a Fee Head.

Recommended setup:

* Name: Security Deposit
* Code: SEC
* Category: Security Deposit

Security Deposit is intended to support future refundable and adjustment workflows.

Future business behavior:

* Security Deposit may be refundable.
* Security Deposit may be adjusted against unpaid eligible fees.
* Remaining deposit balance may then be refunded.

Example:

Security Deposit collected: ₹5,000

Outstanding eligible fees: ₹2,000

Adjustment: ₹2,000

Refund: ₹3,000

Remaining Deposit Balance: ₹0

Do NOT implement this transactional behavior inside Module 03F.

Future Finance modules must handle:

* Deposit collection
* Deposit balance
* Deposit adjustment
* Refund
* Audit history

The original deposit transaction must never be silently altered when adjustments or refunds occur.

---

# Deferred Finance Fields

Do NOT add these to Fee Heads unless later approved through a database migration:

* Fee Amount
* Fee Type
* One-Time / Recurring
* Refundable flag
* Allow Adjustment flag
* Deposit Balance
* Due Date Rule
* Late Fee Rule
* Frequency
* Mandatory / Optional
* Tax / GST configuration

These belong to future Finance architecture.

---

# Duplicate Handling

The live database has unique constraints on:

* `(institute_id, name)`
* `(institute_id, code)`

In addition:

* Perform case-insensitive institute-scoped duplicate checks.
* Exclude the current Fee Head during Edit.
* Handle PostgreSQL `23505` defensively.

Friendly messages:

* `A Fee Head with this name already exists.`
* `A Fee Head with this code already exists.`

Do not expose raw PostgreSQL or Supabase errors.

---

# Search

Search by:

* Fee Head Name
* Code

Search should be case-insensitive.

---

# Filters

Provide:

## Category

* All Categories
* Academic
* Examination
* Security Deposit
* Miscellaneous
* Custom categories where present

## Status

* All
* Active
* Inactive

---

# Summary Cards

Display:

* Total Fee Heads
* Active Fee Heads
* Inactive Fee Heads

All counts must be scoped to the authenticated institute.

---

# User Interface

Route:

`/masters/fee-heads`

Page title:

**Fee Heads**

Subtitle:

**Manage fee categories used by your institute.**

Primary action:

**Add Fee Head**

---

# Desktop Table

Columns:

* Name
* Code
* Category
* Display Order
* Status
* Actions

Actions:

* View
* Edit

---

# Mobile Layout

Provide responsive cards showing equivalent information:

* Name
* Code
* Category
* Display Order
* Status
* Actions

---

# Create / Edit Dialog

Fields:

* Fee Head Name
* Code
* Category
* Custom Category, conditionally
* Display Order
* Active

Use:

* React Hook Form
* Zod

Validation must also run server-side.

---

# View Dialog

Display:

* Name
* Code
* Category
* Display Order
* Active / Inactive
* Created On
* Updated On, where available

---

# Empty State

When there are no Fee Heads:

Display:

**No Fee Heads have been created yet.**

Primary action:

**Add Fee Head**

---

# No Results State

When search or filters return no matches:

Display a clear no-results state.

Allow the administrator to clear the active search/filters.

---

# Error Handling

Provide controlled user-facing errors for:

* Invalid input
* Duplicate Name
* Duplicate Code
* Unauthorized access
* Cross-institute access
* Missing record
* Database failure
* Unexpected server error

Do not display raw Supabase/PostgreSQL errors.

---

# `updated_at`

The database has an `updated_at` column but no automatic trigger.

During Edit:

* explicitly set `updated_at` to the current timestamp.

Do not create a trigger in this module.

---

# Navigation

Under Masters, enable:

* Academic Years
* School Boards
* Classes
* Subjects
* Batches
* Fee Heads

Add:

* Payment Modes — Coming Soon / disabled until Module 03G

Preserve the existing Finance/Fees navigation placeholder.

---

# Architecture

Reuse the architecture already established by completed Masters modules:

* Protected Server Component route
* Server-only service layer
* Server Actions
* Zod validation
* Typed/discriminated action results
* Administrator authorization
* Institute scoping
* Responsive manager
* Create/Edit/View dialogs
* Summary cards
* Search and filters
* Loading state
* Empty/no-results states
* Toast feedback

Do not introduce a generic CRUD framework.

---

# Security

Every page and Server Action must:

1. Require an authenticated session.
2. Require an active profile.
3. Require administrator authorization.
4. Require a valid profile institute.
5. Derive institute identity server-side.
6. Never accept browser-supplied institute ownership.
7. Scope reads and writes by institute.
8. Scope individual record operations by ID and institute ID.
9. Validate all inputs server-side.
10. Return controlled public errors.
11. Avoid service-role credentials in browser-accessible code.

---

# Database Restrictions

Do not:

* create or alter tables;
* add columns;
* create migrations;
* modify foreign keys;
* create triggers;
* create RPCs/functions;
* add indexes;
* modify grants;
* enable or modify RLS;

without explicit approval.

RLS remains a separate project-wide security task.

---

# Delete

Do not implement Fee Head deletion in Module 03F.

Fee Heads may later be referenced by:

`student_fee_assignments.fee_head_id`

Deletion behavior must be reviewed separately before any delete feature is introduced.

---

# Finance Boundaries

Module 03F must NOT implement:

* Student Fee Assignment
* Fee Amount calculation
* Fee Collection
* Payments
* Outstanding balances
* Receipt generation
* Security Deposit refunds
* Security Deposit adjustments
* Discounts
* Finance reports

Those belong to later Finance modules.

---

# Regression Requirements

Do not break:

* Authentication
* Email + OTP
* Logout
* Protected routes
* Dashboard
* Desktop navigation
* Mobile navigation
* Academic Years
* School Boards
* Classes
* Subjects
* Batches
* Batch Board/Class/Subject integration
* Batch safe-deletion behavior

---

# Testing

## Access

Verify:

* Logged-out access redirects to Login.
* Inactive users are rejected.
* Administrator aliases can access Fee Heads.
* Unsupported roles cannot access.

## Institute Isolation

Verify:

* Only current-institute Fee Heads appear.
* Cross-institute record IDs cannot be viewed or edited.
* Browser cannot override institute ID.

## Create

Verify:

* Valid Fee Head succeeds.
* Empty Name fails.
* Empty Code fails.
* Empty Category fails.
* Invalid Display Order fails.
* Duplicate Name fails.
* Duplicate Code fails.
* Other + blank Custom Category fails.
* Other + valid Custom Category succeeds.

## Edit

Verify:

* All supported fields can be edited.
* Existing record is excluded from duplicate checks.
* `updated_at` changes.
* Cross-institute updates fail.

## Search / Filters

Verify:

* Name search
* Code search
* Category filter
* Status filter
* Combined filtering
* Clear filters
* No-results state

## UI

Verify:

* Desktop table
* Mobile cards
* Create dialog
* Edit dialog
* View dialog
* Loading state
* Empty state
* Success/error toasts
* Keyboard navigation
* Focus behavior

---

# Verification Commands

Run:

`npm.cmd run lint`

`npx.cmd tsc --noEmit`

`npm.cmd run build`

`git diff --check`

Then review:

`git status`

`git diff`

Do not commit or push until explicitly approved.

---

# Acceptance Criteria

Module 03F is complete when:

* `/masters/fee-heads` works.
* Administrator authorization is enforced.
* Institute scoping is enforced.
* Fee Heads can be listed.
* Fee Heads can be created.
* Fee Heads can be viewed.
* Fee Heads can be edited.
* Name/Code duplicate handling works.
* Categories work.
* Custom category works.
* Display Order works.
* Active/Inactive works.
* Search works.
* Filters work.
* Summary cards work.
* Fee Heads navigation is enabled.
* Payment Modes remains Coming Soon.
* No unsupported financial behavior is introduced.
* No unapproved schema changes occur.
* Existing ERP modules remain functional.
* Lint passes.
* TypeScript passes.
* Production build passes.
* `git diff --check` passes.

---

# Implementation Workflow

Before implementation:

1. Read `AGENTS.md`.
2. Read all files inside `.codex/`.
3. Read this specification.
4. Confirm the live `public.fee_heads` schema has not changed.
5. Confirm existing constraints and relationships.
6. Inspect completed Masters patterns.
7. Implement only this approved scope.

After implementation:

1. Run all verification commands.
2. Review the complete diff.
3. Perform authenticated browser testing.
4. Report:

   * files created;
   * files modified;
   * files removed;
   * implemented behavior;
   * validation behavior;
   * verification results;
   * manual testing still required;
   * remaining risks.

Do not commit or push.

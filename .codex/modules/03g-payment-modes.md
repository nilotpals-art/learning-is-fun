# Module 03G – Payment Modes

## Status

Planned

---

# Objective

Implement the Payment Modes master module for Learning Is Fun ERP.

Payment Modes define the methods accepted by the institute for receiving or refunding money.

Examples:

* Cash
* UPI
* Bank Transfer
* Cheque

The live Supabase schema is the source of truth.

Do not invent fields or relationships.

---

# Initial Requirement

Before implementation, inspect the live Supabase schema and determine:

* actual Payment Modes table name;
* columns;
* data types;
* nullability;
* defaults;
* primary key;
* foreign keys;
* unique constraints;
* indexes;
* RLS status;
* grants;
* existing records;
* institute ownership;
* inbound and outbound relationships.

Do not modify files during analysis.

---

# Access

Administrator only.

Student and Parent users must not have access to Payment Mode administration.

---

# Fields

Do NOT implement:

* Code
* Display Order

Use only actual persisted fields supported by the live schema.

Expected business fields:

* Payment Mode Name
* Active / Inactive, only if supported by the schema

Do not add unsupported fields.

---

# Initial Payment Modes

The institute should start with:

* Cash
* UPI
* Bank Transfer
* Cheque

All initial modes should be Active if the live schema supports active status.

These standard Payment Modes should not require manual administrator creation.

---

# Initialization Strategy

The initialization must be:

* institute-scoped;
* authenticated;
* administrator-controlled or safely application-initialized;
* idempotent;
* duplicate-safe.

Rules:

* Derive institute ID server-side.
* Never hard-code an institute UUID.
* Never modify another institute's records.
* Preserve existing custom Payment Modes.
* Do not overwrite existing records unnecessarily.
* Do not create duplicate modes.
* Do not perform hidden writes during every page read.

Before implementation, inspect existing data and constraints and propose the safest initialization mechanism.

If a setup action is required, prefer a controlled Server Action.

If the live schema already contains the required standard modes for the institute, do not recreate them.

---

# Functional Requirements

Subject to the actual schema, support:

* List Payment Modes
* View Payment Mode
* Create custom Payment Mode
* Edit Payment Mode
* Search Payment Modes
* Active / Inactive filtering, if supported

Do not implement hard delete unless separately approved.

---

# Institute Scoping

If Payment Modes are institute-scoped:

* derive institute ID from the authenticated profile;
* never accept institute ID from browser input;
* list only records belonging to the authenticated institute;
* scope reads and updates by Payment Mode ID and institute ID.

If the table is global rather than institute-scoped, stop and report that before implementation.

Do not invent ownership.

---

# Validation

Use Zod.

Validation must match actual persisted fields.

## Payment Mode Name

If a name field exists:

* Required
* Trim whitespace
* Cannot be whitespace-only

If the database does not enforce case-insensitive uniqueness:

* perform an institute-scoped, case-insensitive duplicate check;
* exclude the current record on edit;
* return a friendly duplicate message;
* document that application-level duplicate checks are not race-proof.

## Active

If persisted:

* Boolean

---

# Architecture

Reuse the established Masters pattern:

* protected Server Component route;
* administrator authorization;
* server-derived institute identity;
* server-only service;
* Server Actions;
* Zod validation;
* typed/discriminated action results;
* responsive manager UI;
* loading state;
* empty/no-results state;
* dialogs;
* toast feedback.

Do not introduce a generic CRUD engine.

---

# UI

Route:

`/masters/payment-modes`

Page title:

**Payment Modes**

Subtitle:

**Manage payment methods accepted by your institute.**

Primary action:

**Add Payment Mode**

---

# Summary Cards

If Active/Inactive exists:

* Total Payment Modes
* Active Payment Modes
* Inactive Payment Modes

Otherwise:

* Total Payment Modes

Do not fabricate status.

---

# Search and Filters

Search by Payment Mode Name.

If active status exists, include:

Status:

* All
* Active
* Inactive

Do not add unnecessary filters.

---

# Desktop Table

The final columns must follow the live schema.

Expected minimal structure:

* Payment Mode
* Status, if supported
* Created On, if available
* Actions

Actions:

* View
* Edit

Do not display Code or Display Order.

---

# Mobile Layout

Provide a responsive card equivalent to the desktop table.

---

# Create / Edit Dialog

Fields must reflect the live schema only.

Expected:

* Payment Mode Name
* Active, if supported

Do not include:

* Code
* Display Order

Use React Hook Form and Zod where consistent with the project.

---

# View Dialog

Show persisted fields only.

Expected:

* Payment Mode Name
* Active / Inactive, if supported
* Created On, if available
* Updated On, if available

---

# Empty / Setup State

If the standard modes are not initialized:

Display a setup experience explaining that the institute can initialize:

* Cash
* UPI
* Bank Transfer
* Cheque

If setup requires an explicit administrator action, provide:

**Create Initial Payment Modes**

The setup operation must be idempotent and institute-scoped.

After initialization, show the standard manager.

---

# Duplicate Handling

If supported by existing database constraints, handle duplicate Payment Mode names cleanly.

Friendly message:

`A Payment Mode with this name already exists.`

Do not expose raw database errors.

---

# Error Handling

Provide controlled errors for:

* invalid input;
* duplicate name;
* unauthorized access;
* cross-institute access;
* missing record;
* database failure;
* unexpected server failure.

---

# Navigation

After successful implementation:

Under Masters, enable:

* Academic Years
* School Boards
* Classes
* Subjects
* Batches
* Fee Heads
* Payment Modes

Payment Modes should route to:

`/masters/payment-modes`

This completes the Masters phase.

---

# Finance Integration

Payment Modes will later be reused by:

* Fee Collection
* Receipts
* Security Deposit collection
* Refunds
* Adjustments where a method/reference is needed

Do not implement any financial transaction workflow inside Module 03G.

---

# Security

Every page and Server Action must:

1. Require authentication.
2. Require an active profile.
3. Require administrator authorization.
4. Derive institute identity server-side where applicable.
5. Never accept browser-supplied institute ownership.
6. Scope record access correctly.
7. Validate all input server-side.
8. Return controlled errors.
9. Avoid service-role credentials in client-accessible code.

---

# Database Restrictions

Do not:

* create tables;
* add columns;
* create migrations;
* enable RLS;
* modify policies;
* create triggers;
* create RPCs/functions;
* add indexes;
* alter constraints;

without explicit approval.

If the schema cannot support part of the specification, stop and report the mismatch.

---

# Delete

Do not implement hard delete in Module 03G unless a later relationship audit and business decision explicitly approve it.

Prefer editing or deactivation where supported.

---

# Regression Requirements

Do not break:

* Authentication
* Dashboard
* Academic Years
* School Boards
* Classes
* Subjects
* Batches
* Fee Heads

---

# Testing

## Access

Verify:

* Logged-out access redirects to Login.
* Inactive users are rejected.
* Administrator aliases can access.
* Unsupported roles cannot.

## Initialization

Verify:

* Empty institute can initialize standard Payment Modes.
* Exactly these initial modes are created:

  * Cash
  * UPI
  * Bank Transfer
  * Cheque
* Re-running setup creates no duplicates.
* Existing custom modes remain untouched.
* Existing exact matches are reused/skipped safely.

## CRUD

Verify:

* Create custom Payment Mode.
* View Payment Mode.
* Edit Payment Mode.
* Duplicate name rejected.
* Search works.
* Active/Inactive works if supported.

## Institute Isolation

Verify:

* Only current-institute records appear.
* Cross-institute IDs cannot be viewed or edited.
* Browser cannot override institute ID.

## UI

Verify:

* Desktop table.
* Mobile cards.
* Setup state.
* Empty/no-results state.
* Dialog focus.
* Keyboard behavior.
* Toast feedback.

## Regression

Verify all completed Masters modules continue to work.

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

Module 03G is complete when:

* `/masters/payment-modes` works.
* Administrator authorization is enforced.
* Institute scoping is correct.
* Cash, UPI, Bank Transfer, and Cheque can be safely initialized.
* Initialization is idempotent.
* Custom Payment Modes can be created.
* Payment Modes can be viewed.
* Payment Modes can be edited.
* Search works.
* Active/Inactive works if supported.
* Code and Display Order are not shown or required.
* Existing Masters modules remain functional.
* No unsupported finance transaction behavior is introduced.
* No unapproved schema changes occur.
* Lint passes.
* TypeScript passes.
* Production build passes.
* `git diff --check` passes.

---

# Implementation Workflow

Before implementation:

1. Read `AGENTS.md`.
2. Read all files inside `.codex/`.
3. Read this module specification.
4. Inspect the live Payment Modes schema.
5. Search for existing Payment Mode code.
6. Inspect constraints, relationships, and existing rows.
7. Compare the schema with this specification.
8. Propose the exact initialization strategy.
9. Wait for approval.

Do not modify files during analysis.

After approval:

1. Implement only the schema-compatible approved scope.
2. Preserve unrelated modules.
3. Run all verification commands.
4. Perform authenticated browser testing.
5. Report:

   * files created;
   * files modified;
   * files removed;
   * initialization behavior;
   * functionality implemented;
   * verification results;
   * remaining risks.

Do not commit or push.

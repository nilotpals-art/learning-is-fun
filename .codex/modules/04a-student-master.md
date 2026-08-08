# Module 04A – Student Master

## Status

Planned

---

# Objective

Implement the Student Master module for Learning Is Fun ERP.

Student Master stores permanent personal, contact, admission, parent/guardian, status, and internal-comment information.

Academic placement must remain separate and will be handled in Module 04B – Student Academic Assignment.

The live Supabase schema is the source of truth.

Do not invent fields, tables, or relationships.

---

# Access

Administrator only for Module 04A.

Student and Parent portal access will be implemented separately.

---

# Student Information

Required:

* Admission Number
* Student Name
* Date of Birth
* Gender
* Student Mobile Number
* Student Email

---

# Admission Number

Admission Number must be automatically generated.

Format:

`LIF/26-27/001`

Structure:

`<Institute Code>/<Academic Year>/<Sequence>`

Examples:

* `LIF/26-27/001`
* `LIF/26-27/002`
* `LIF/26-27/003`

Next Academic Year:

* `LIF/27-28/001`

Rules:

* Generated server-side.
* Read-only.
* Never entered manually.
* Never editable after Student creation.
* Unique.
* Sequence restarts for each Academic Year.
* Generation must be concurrency-safe.

Do not implement a race-prone:

`MAX(sequence) + 1`

or equivalent application-only algorithm.

Before implementation inspect:

* Student admission-number column;
* uniqueness constraints;
* Institute code source;
* Academic Year source;
* sequence/counter tables;
* database functions;
* triggers;
* RPCs;
* existing admission-number implementation.

If the live database cannot guarantee concurrency-safe generation:

STOP.

Provide:

* schema gap;
* smallest safe database solution;
* migration SQL;
* rollback SQL;
* concurrency explanation;
* application impact.

Wait for explicit approval before making database changes.

---

# Academic Year During Admission

Academic Year must be selected during initial admission because it is required for Admission Number generation.

However:

Academic Year must NOT become a permanent Student Master relationship.

The selected Academic Year will later be used when creating the initial Student Academic Assignment.

Do not introduce a permanent Student → Academic Year relationship unless the live schema explicitly requires it.

---

# Student Name

Required.

Validation:

* Trim whitespace.
* Cannot be empty.

---

# Date of Birth

Required.

Validation:

* Valid date.
* Must not be in the future.

Do not invent age restrictions.

---

# Gender

Required.

Before implementation inspect the live schema and existing values.

Do not invent database enums or constraints.

---

# Student Mobile Number

Required.

Validation must follow existing project conventions.

Do not invent country-specific formatting rules unless already standardized by the project.

---

# Student Email

Required.

Purpose:

Student Email + OTP login.

Rules:

* Valid email.
* Trim whitespace.
* Normalize to lowercase.
* Must uniquely identify the Student login.
* Must not be shared by different Student accounts.

Before implementation inspect:

* Students table;
* `auth.users`;
* `profiles`;
* roles;
* Student role availability;
* existing user provisioning logic.

Do not create Student Auth users until the provisioning architecture has been reviewed and approved.

---

# Address

Use only one field:

**Address**

Requirements:

* Single multiline text area.
* Optional unless the live schema requires it.

Do NOT add:

* Address Line 2
* City
* State
* PIN Code
* Country

---

# Parent / Guardian

Required:

* Father / Guardian Name
* Relationship
* Parent Mobile Number
* Parent Email

Optional:

* Mother Name

Do NOT add:

* Parent Occupation

---

# Parent Relationship Model

This is a critical business requirement.

A Parent/Guardian may have multiple children enrolled.

The relationship must support:

`One Parent → Many Students`

Example:

Parent Account

* Student 1
* Student 2
* Student 3

A Parent must not require a separate login for every child.

---

# Parent Email

Required.

Purpose:

Parent Email + OTP login.

Rules:

* Valid email.
* Trim whitespace.
* Normalize to lowercase.

Important:

Parent Email must NOT be unique per Student.

The same Parent Email may legitimately appear for multiple siblings.

Example:

* Child A → `parent@example.com`
* Child B → `parent@example.com`
* Child C → `parent@example.com`

All three children should be accessible through the same Parent account.

---

# Existing Parent Reuse

Before creating a new Parent:

1. Normalize Parent Email.
2. Search for an existing Parent within the authenticated institute.
3. If the Parent already exists:

   * reuse the existing Parent record;
   * link the new Student to that Parent;
   * do not create another Parent record;
   * do not create another Auth account.
4. If the Parent does not exist:

   * create the Parent according to the approved Parent provisioning workflow;
   * link the Student to the new Parent.

Do not create duplicate Parent records for siblings.

---

# Parent Authentication

One Parent Email + OTP login should eventually allow the Parent to access all linked children.

Codex must inspect:

* Parent/Guardian tables;
* Student ↔ Parent relationship tables;
* `auth.users`;
* `profiles`;
* Parent role availability;
* institute ownership;
* RLS;
* existing user provisioning logic.

Determine how an authenticated Parent can securely retrieve all linked Students.

Do not implement a one-parent-per-student authentication design.

Do not create Parent Auth users until the provisioning workflow has been explicitly reviewed and approved.

---

# Father / Guardian Name

Required.

Validation:

* Trim whitespace.
* Cannot be empty.

If an existing Parent is reused by email, determine whether existing Parent details should remain authoritative or be updated.

Do not silently overwrite an existing Parent's information during sibling admission.

Report any conflicting Parent details for administrator review.

---

# Mother Name

Optional.

Trim whitespace when provided.

---

# Relationship

Required.

Examples may include:

* Father
* Mother
* Guardian

Inspect the existing schema before defining controlled values.

Do not create an enum or database constraint without approval.

---

# Parent Mobile Number

Required.

Use the same validation approach as Student Mobile Number.

If an existing Parent record is reused, do not silently replace an existing mobile number without an approved conflict-handling rule.

---

# Admission Details

Required:

* Admission Date

Validation:

* Valid date.

---

# Student Status

Approved business statuses:

* Active
* Inactive
* Completed
* Left

Default:

`Active`

Before implementation inspect the actual Student schema.

If the database has only an `is_active` boolean or a different status model, report the mismatch before implementing status behavior.

Do not create new database status constraints without approval.

---

# Comments

Add:

**Comments**

Requirements:

* Optional multiline text area.
* Internal administrative notes.
* Editable by Administrator.
* Visible in Administrator Student profile.

Comments must NOT automatically appear in:

* Student Portal
* Parent Portal
* Report Cards
* Public-facing screens

unless separately approved later.

---

# Fields Explicitly Excluded

Do NOT implement:

* Photo
* Documents
* Parent Occupation
* School Roll Number
* Address Line 2
* City
* State
* PIN Code
* Country

---

# Student Academic Information

Do NOT permanently store the following as Student Master properties unless required by the live schema:

* Academic Year
* School Name
* School Board
* Class
* Batch

These belong to Module 04B – Student Academic Assignment.

---

# Module 04B – Student Academic Assignment

Future Academic Assignment fields:

* Academic Year
* School Name
* School Board
* Class
* Batch
* Effective From
* Effective To (Optional)

No School Roll Number.

---

# School Name

School Name must support:

* Search existing Schools.
* Select an existing School.
* Type a new School when no match exists.
* Add the new School safely.
* Prevent case-insensitive duplicates.

The future UI should behave like a searchable combobox.

Example:

`School Name *`

Search existing Schools.

If no match:

`+ Add "Example School"`

Before Module 04B implementation inspect the live `schools` schema.

Do not implement School creation in Student Master.

---

# Student List

Route:

`/students`

Recommended schema-supported columns:

* Admission Number
* Student Name
* Student Email
* Student Mobile Number
* Status
* Admission Date
* Actions

Do not expose Comments in the main Student list.

Actions:

* View
* Edit

Do not implement hard delete.

---

# Create Student

The Student creation workflow must:

1. Require authenticated Administrator.
2. Derive institute ID server-side.
3. Validate all Student input.
4. Validate Student Email.
5. Validate Parent Email.
6. Resolve/reuse the Parent relationship.
7. Select Academic Year for Admission Number generation.
8. Generate Admission Number safely.
9. Create Student.
10. Link Student to Parent.
11. Preserve Admission Number permanently.

The workflow must not rely on browser-supplied institute ownership.

---

# Parent Resolution During Student Creation

Student creation must resolve Parent identity by normalized Parent Email within the authenticated institute.

Possible outcomes:

## Existing Parent

Reuse it and link the new Student.

## New Parent

Create Parent according to approved provisioning rules.

## Conflicting Existing Parent Data

For example:

Same Parent Email but different Parent Name or Mobile Number.

Do not silently create a duplicate.

Do not silently overwrite the existing Parent.

Return a controlled conflict that allows the Administrator to review the existing Parent information.

---

# Edit Student

Administrator may edit approved Student Master fields.

Admission Number is immutable.

Parent-link changes must be handled carefully.

Changing Parent Email may mean:

* linking to another existing Parent;
* creating a new Parent;
* unlinking from the previous Parent.

Do not treat Parent Email as an ordinary text-field update if Parent records are normalized entities.

The live schema must determine the implementation.

---

# View Student

Administrator Student profile should display:

## Student Information

* Admission Number
* Student Name
* DOB
* Gender
* Mobile
* Email

## Address

* Address

## Parent / Guardian

* Parent/Guardian information
* Parent Email
* Parent Mobile

If one Student supports multiple guardian relationships in the live schema, report that before limiting the UI to one.

## Admission

* Admission Date
* Status

## Comments

* Internal Comments

Academic Assignment will be displayed separately after Module 04B exists.

---

# Search

Where supported, search by:

* Admission Number
* Student Name
* Student Email
* Parent Email
* Student Mobile
* Parent Mobile

Search must remain institute-scoped.

---

# Filters

At minimum, if supported:

Status:

* All
* Active
* Inactive
* Completed
* Left

Do not add unsupported filters.

---

# Summary Cards

Recommended:

* Total Students
* Active Students
* Inactive Students

Additional status counts may be included only when useful and schema-supported.

All counts must be institute-scoped.

---

# Institute Scoping

Every Student operation must:

* derive institute ID from authenticated profile;
* never accept institute ID from browser input;
* list only Students belonging to the authenticated institute;
* scope Student reads and writes by Student ID + institute ID.

Parent reuse must also be institute-aware unless the live schema explicitly defines Parents globally.

A Parent account must never gain access to a Student from another institute merely because the email address matches.

---

# Architecture

Reuse existing ERP architecture:

* Protected Server Components
* Server Actions
* Server-only services
* Zod
* React Hook Form
* Typed/discriminated action results
* Responsive desktop/mobile UI
* Loading states
* Empty/no-results states
* Toast feedback

Do not introduce unnecessary API routes.

Do not create a generic Student framework until the live schema is understood.

---

# Authentication Integration

Student Email and Parent Email are intended for Email + OTP login.

Before implementation inspect:

* `auth.users`
* `profiles`
* roles
* Student role
* Parent role
* Student records
* Parent records
* Student/Parent link tables
* existing Auth provisioning code

Determine:

* how Student Auth users should be created;
* how Parent Auth users should be created;
* how profiles map to Auth users;
* how Parent Auth identity maps to one Parent entity;
* how the Parent entity maps to multiple Students;
* how Parent access is constrained by institute.

Do not assume Student creation automatically creates an Auth user.

Do not assume Parent creation automatically creates an Auth user.

---

# Privileged User Provisioning

If creating Student/Parent Auth users requires privileged operations:

STOP.

Provide:

* exact required server architecture;
* whether a server-only service-role client is necessary;
* which operation needs privilege;
* security boundaries;
* how credentials remain server-only;
* failure/rollback behavior.

Do not expose service-role credentials to Client Components.

Do not implement privileged provisioning without approval.

---

# Admission Number Safety

Admission Number is a permanent critical identifier.

Codex must verify whether the live database can safely generate:

`LIF/26-27/001`

with sequence reset by Academic Year.

Generation must remain safe when two administrators create Students simultaneously.

If current infrastructure cannot guarantee uniqueness:

STOP.

Provide the minimal database design required.

---

# Delete

Do not implement Student hard delete.

Student history will eventually be referenced by:

* Academic Assignments
* Attendance
* Homework
* Examinations
* Marks
* Fees
* Payments
* Reports

Use Student status instead.

---

# Security

Every operation must:

1. Require authentication.
2. Require active Administrator profile.
3. Derive institute identity server-side.
4. Validate input server-side.
5. Scope Student reads/writes by institute.
6. Scope Parent resolution appropriately.
7. Prevent cross-institute Student access.
8. Prevent cross-institute Parent access.
9. Avoid leaking Student or Parent login details.
10. Never expose privileged credentials.

Parent portal security must eventually ensure:

`Authenticated Parent → Parent Entity → Linked Students`

and never:

`Authenticated Parent → arbitrary Student by email or ID`

---

# Database Rules

Do NOT:

* create tables;
* add columns;
* change constraints;
* add indexes;
* create triggers;
* create functions/RPCs;
* modify RLS;
* modify grants;

without explicit approval.

If the schema cannot support this design, stop and report the mismatch.

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
* Payment Modes

---

# Testing

## Access

Verify:

* Logged-out access redirects to Login.
* Inactive Administrator rejected.
* Administrator roles can access.
* Unsupported roles cannot administer Students.

---

## Student Creation

Verify:

* Valid Student creates.
* Student Email required.
* Parent Email required.
* Invalid Student Email rejected.
* Invalid Parent Email rejected.
* Address optional.
* Mother Name optional.
* Comments optional.

---

## Parent/Sibling Behavior

Verify:

1. Create first Student with Parent Email A.
2. Parent A is created/resolved.
3. Create second Student with the same Parent Email A.
4. Existing Parent is reused.
5. No duplicate Parent is created.
6. Both Students are linked to Parent A.
7. Parent A can eventually retrieve both linked Students.
8. Parent A cannot retrieve another institute's Students.

Test case-insensitive email matching:

* `Parent@Example.com`
* `parent@example.com`

must resolve to the same Parent where appropriate.

---

## Parent Conflict

Test:

Existing Parent Email with different Name/Mobile details.

Expected:

* No duplicate Parent.
* No silent overwrite.
* Controlled Administrator review/error.

---

## Admission Number

Verify:

* Format is correct.
* Academic Year is correctly represented.
* Sequence begins at `001`.
* Sequence increments.
* New Academic Year resets the sequence.
* Concurrent admissions cannot duplicate Admission Numbers.
* Admission Number cannot be edited.

---

## Edit

Verify:

* Student fields update.
* Admission Number remains unchanged.
* Institute remains unchanged.
* Cross-institute update fails.
* Parent link changes follow approved relationship logic.

---

## Search / Filters

Verify supported search and Student-status filtering.

---

## UI

Verify:

* Desktop Student list
* Mobile Student cards
* Create flow
* Edit flow
* View flow
* Loading
* Empty
* No results
* Toasts
* Keyboard/focus behavior

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

Module 04A is complete when:

* Student list works.
* Student creation works.
* Student viewing works.
* Student editing works.
* Admission Number generation is concurrency-safe.
* Admission Number is immutable.
* Student Email is required.
* Parent Email is required.
* Student Email maps to one Student login.
* Parent Email supports sibling reuse.
* One Parent can link to multiple Students.
* Duplicate Parent accounts are not created for siblings.
* Parent conflicts are handled safely.
* Address is a single field.
* Comments work.
* No Photo/Documents/Occupation/Roll Number fields exist.
* Student Status follows the actual schema.
* Institute isolation is enforced.
* Academic Assignment remains separate.
* Existing ERP modules remain functional.
* No unapproved database changes occur.
* Lint passes.
* TypeScript passes.
* Production build passes.
* `git diff --check` passes.

---

# Implementation Workflow

Before coding:

1. Read `AGENTS.md`.
2. Read all `.codex/` files.
3. Read this specification.
4. Inspect Students schema.
5. Inspect Parent/Guardian schema.
6. Inspect Student ↔ Parent relationships.
7. Verify one-to-many Parent → Students support.
8. Inspect `auth.users`, `profiles`, and roles.
9. Inspect Auth provisioning.
10. Inspect Academic Year and institute-code sources.
11. Inspect Admission Number infrastructure.
12. Inspect future Academic Assignment tables.
13. Search existing Student code.
14. Produce an implementation plan.
15. Wait for approval.

Do not modify files during analysis.

After approval:

1. Implement only approved schema-compatible scope.
2. Preserve unrelated code.
3. Run verification.
4. Perform authenticated browser testing.
5. Report files, tests, database decisions, and remaining risks.

Do not commit or push.

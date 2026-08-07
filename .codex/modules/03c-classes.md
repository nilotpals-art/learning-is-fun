# Module 03C – Classes

## Status

Planned

---

# Objective

Implement the Classes master module for Learning Is Fun ERP.

Classes represent permanent academic levels such as:

* Nursery
* LKG
* UKG
* Class I
* Class II
* Class III
* Class IV
* Class V
* Class VI
* Class VII
* Class VIII
* Class IX
* Class X
* Class XI
* Class XII

Classes must remain independent of Academic Years.

Do not create a direct Academic Year → Class relationship.

---

# Business Model

Academic Year represents a session or time period.

Class represents a permanent academic level.

Therefore:

* Academic Year must NOT belong to Class.
* Class must NOT contain academic_year_id.
* Academic Year must NOT be selected on the Class form.

Academic Year association will be handled later through Batches, Student Academic Assignments, or the existing schema relationships.

---

# Initial Scope

Do not assume which fields exist.

Before implementation, Codex must inspect the live Supabase schema and identify:

* actual Classes table name;
* columns;
* constraints;
* indexes;
* foreign keys;
* existing rows;
* RLS status;
* relationships to Boards, Subjects, Batches, Students, or other tables.

The live database schema is the source of truth.

---

# Expected Functional Purpose

The Classes module should allow administrators to manage the academic levels available within their institute.

Potential operations, subject to the actual schema:

* List Classes
* View Class
* Create Class
* Edit Class
* Search Classes

Additional functionality such as:

* Active / Inactive
* Display Order
* Board assignment
* Description

must only be implemented if those fields or relationships exist in the live schema or are separately approved.

---

# Access

Administrator only.

Students and Parents must not have access to Classes administration.

---

# Institute Scoping

All Classes data must be scoped to the authenticated user's institute where the schema supports institute ownership.

Rules:

* Derive institute identity server-side.
* Never trust institute_id sent from the browser.
* Cross-institute reads and mutations must fail.
* If the live Classes schema is global rather than institute-specific, report that before implementation instead of inventing institute ownership.

---

# Academic Year Rule

Academic Year must not be connected directly to Class.

Do not:

* add academic_year_id;
* add Academic Year dropdowns;
* filter Classes by Academic Year;
* create an Academic Year/Class join;
* modify the database to introduce this relationship.

---

# Board Relationship

Do not assume Class belongs directly to a Board.

Inspect the live schema first.

If a Board/Class relationship exists:

* report exactly how it is modeled;
* reuse it only if consistent with the existing business model.

If no relationship exists:

* do not invent one.

---

# Validation

Use Zod.

Validation must reflect actual persisted fields.

At minimum, if a name field exists:

## Class Name

* Required
* Trim whitespace
* Cannot be whitespace-only

Duplicate handling must follow existing database constraints.

If no database uniqueness constraint exists, Codex may use an application-level duplicate check but must report that it is not race-proof.

---

# Architecture

Use Module 03A – Academic Years and Module 03B – School Boards as reference implementations.

Reuse:

* feature-folder architecture;
* Server Actions;
* server-only service layer;
* Zod validation;
* discriminated Server Action result types;
* authenticated administrator authorization;
* institute scoping;
* responsive manager pattern;
* loading state;
* empty state;
* search pattern;
* dialogs;
* toast feedback;
* existing application shell.

Do not copy code unnecessarily.

Extract shared abstractions only when they are clearly reusable and do not complicate the codebase.

---

# UI Direction

The module should fit inside the existing Dashboard/Application Shell.

Recommended page title:

**Classes**

Subtitle:

**Manage academic class levels available in your institute.**

Primary action:

**Add Class**

The final UI must be based on the actual live schema.

---

# Search

Provide Class search by name where supported.

Do not create filters for fields that do not exist.

---

# Table / Mobile Layout

At minimum, if the schema only contains Class Name:

* Class Name
* Created On, if available
* Actions

Actions:

* View
* Edit

Do not implement:

* Delete
* Activate / Deactivate
* Display Order
* Board assignment
* Academic Year assignment

unless supported by the schema and approved.

---

# Empty State

If no Classes exist:

Display:

**No Classes have been created yet.**

Provide:

**Add Class**

---

# Navigation

After successful implementation:

Enable:

* Academic Years
* School Boards
* Classes

Keep disabled / Coming Soon:

* Subjects
* Batches

Classes should route to:

`/masters/classes`

---

# Database Rules

Do not:

* create or modify tables;
* add columns;
* rename columns;
* create migrations;
* enable RLS;
* create policies;
* create triggers;
* create RPCs/functions;
* add indexes;
* modify constraints;

without explicit approval.

If the current schema cannot support the requested module safely, stop and report the conflict.

---

# Security

Every implemented query and mutation must:

1. Validate authentication.
2. Validate active profile.
3. Validate administrator role.
4. Derive institute identity server-side where applicable.
5. Scope record access appropriately.
6. Validate input server-side.
7. Return controlled user-facing errors.

Do not expose raw database errors.

Do not use browser-accessible service-role credentials.

---

# Regression Requirements

Do not break:

* Email + OTP Authentication
* Logout
* Session refresh
* Protected routes
* Dashboard
* Desktop sidebar
* Mobile navigation
* Academic Years
* School Boards

---

# Verification

Run:

* `npm.cmd run lint`
* `npx.cmd tsc --noEmit`
* `npm.cmd run build`
* `git diff --check`

Review:

* `git status`
* `git diff`

Do not commit or push until explicitly approved.

---

# Acceptance Criteria

Module 03C is complete when:

* `/masters/classes` works.
* Administrator access is enforced.
* Classes can be listed.
* Classes can be created.
* Classes can be viewed.
* Classes can be edited.
* Search works.
* Data access follows the actual schema.
* No direct Academic Year/Class relationship is introduced.
* Existing Authentication remains intact.
* Existing Dashboard remains intact.
* Academic Years remains intact.
* School Boards remains intact.
* Classes navigation becomes enabled.
* Subjects and Batches remain disabled.
* No unapproved database changes were made.
* Lint passes.
* TypeScript passes.
* Production build passes.
* `git diff --check` passes.

---

# Implementation Workflow

Before writing code:

1. Read `AGENTS.md`.
2. Read all `.codex/` framework files.
3. Read this module specification.
4. Inspect the live Supabase schema for Classes.
5. Search the repository for existing Class-related code.
6. Inspect relationships and constraints.
7. Compare the schema with the business requirements.
8. Identify reusable patterns from Academic Years and School Boards.
9. Produce an implementation plan.
10. Wait for approval.

Do not modify files during analysis.

After approval:

1. Implement only the approved schema-compatible scope.
2. Preserve unrelated code.
3. Run all verification commands.
4. Review the complete diff.
5. Report created, modified, and removed files.
6. Report any database/security follow-up separately.

Do not commit or push.

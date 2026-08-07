# Module 03D – Subjects

## Status

Planned

---

# Objective

Implement the Subjects master module for Learning Is Fun ERP.

Subjects represent permanent academic subjects such as:

* English
* Mathematics
* Science
* Physics
* Chemistry
* Biology
* History
* Geography
* Computer Science

The module must follow the same architecture and development standards established in:

* Module 03A – Academic Years
* Module 03B – School Boards
* Module 03C – Classes

Do not redesign the CRUD architecture.

---

# Business Model

A Subject is a reusable academic master.

Subjects must remain independent of:

* Academic Year
* Class
* Board
* Batch

Do not add direct relationships unless the live database schema already models them and the relationship is approved.

Curriculum, batch, or class-subject relationships should be handled by separate relationship modules where appropriate.

---

# Initial Requirement

Before implementation, inspect the live Supabase schema.

Do not assume:

* table name;
* fields;
* relationships;
* active status;
* description;
* display order;
* codes.

The existing database is the source of truth.

---

# Access

Administrator only.

Student and Parent users must not have access to Subject administration.

---

# Functional Scope

Subject to the live schema, the module should support:

* List Subjects
* View Subject
* Create Subject
* Edit Subject
* Search Subjects

Do not implement hard delete.

Additional functionality such as:

* Subject Code
* Short Name
* Description
* Display Order
* Active / Inactive
* Class assignment
* Board assignment

must be implemented only when supported by the actual schema and approved.

---

# Institute Scoping

If Subjects belong to an institute:

* derive institute ID from the authenticated profile;
* never accept institute ID from browser input;
* filter lists by institute;
* filter record operations by record ID and institute ID;
* exclude unscoped legacy records where appropriate.

If Subjects are global rather than institute-scoped, stop and report that architecture before implementation.

Do not invent institute ownership.

---

# Relationship Rules

## Academic Year

Subject must not be directly tied to Academic Year unless the existing schema explicitly does so.

Do not add:

* academic_year_id;
* Academic Year dropdown;
* Academic Year filter.

---

## Class

Do not assume Subject belongs directly to Class.

If a Class/Subject relationship exists elsewhere, report it and leave it for the appropriate relationship module unless explicitly approved here.

---

## Board

Do not assume Subject belongs directly to Board.

---

## Batch

A Batch may reference a Subject if supported by the live schema.

Subject itself should remain a reusable master.

---

# Validation

Use Zod.

Validation must reflect persisted fields only.

If a Subject Name field exists:

* Required
* Trim whitespace
* Cannot be whitespace-only

If the database does not enforce uniqueness:

* perform a case-insensitive application-level duplicate check where appropriate;
* exclude the current record during update;
* return a friendly duplicate message;
* document that application-level checking is not race-proof.

For optional numeric fields such as display order, if present:

* integer only;
* zero or greater;
* blank values may persist as NULL where appropriate.

---

# Architecture

Reuse established master-module patterns.

Prefer:

* `features/subjects/types/...`
* `features/subjects/validations/...`
* `features/subjects/services/...`
* `features/subjects/actions/...`
* `features/subjects/components/...`

Reuse:

* server-only services;
* Server Actions;
* discriminated action results;
* authenticated role checks;
* institute scoping;
* responsive manager UI;
* create/edit/view dialogs;
* search;
* loading states;
* empty states;
* toast feedback.

Do not build a generic CRUD framework unless the existing implementations clearly justify one.

---

# UI Direction

Route:

`/masters/subjects`

Page title:

**Subjects**

Subtitle:

**Manage academic subjects available in your institute.**

Primary action:

**Add Subject**

The final form and table fields must follow the live schema.

---

# Summary

At minimum:

* Total Subjects

If the schema supports Active / Inactive:

* Active Subjects
* Inactive Subjects

Do not fabricate status if no status field exists.

---

# Search and Filters

At minimum:

* Search by Subject Name

Add filters only for fields actually supported by the database.

---

# Table / Mobile View

Columns must follow the schema.

A minimal schema-compatible table may contain:

* Subject Name
* Created On
* Actions

Additional supported columns may include:

* Short Name
* Subject Code
* Display Order
* Status

Actions:

* View
* Edit

Activation/deactivation may be added only if a persisted active-status field exists.

Do not add hard delete.

---

# Empty State

When no records exist, show:

**No Subjects have been created yet.**

Primary action:

**Add Subject**

---

# Error Handling

Return friendly errors for:

* Invalid fields
* Duplicate Subject Name
* Unauthorized access
* Cross-institute access
* Database failures
* Unexpected server failures

Do not expose raw Postgres or Supabase errors.

---

# Navigation

After successful implementation:

Enable:

* Academic Years
* School Boards
* Classes
* Subjects

Keep disabled:

* Batches

Subjects should route to:

`/masters/subjects`

---

# Database Rules

Do not:

* create tables;
* modify tables;
* add columns;
* create migrations;
* enable RLS;
* create policies;
* add triggers;
* create functions/RPCs;
* add indexes;
* alter constraints;

without explicit approval.

If the requested feature cannot be supported by the current schema, stop and report the conflict.

---

# Security

Every operation must:

1. Require an authenticated session.
2. Require an active profile.
3. Require an administrator role.
4. Derive institute identity server-side where applicable.
5. Scope record access correctly.
6. Validate inputs server-side.
7. Return controlled errors.
8. Avoid service-role credentials in browser-accessible code.

---

# Regression Requirements

Do not break:

* Email + OTP Authentication
* Logout
* Session handling
* Protected routes
* Dashboard
* Desktop navigation
* Mobile navigation
* Academic Years
* School Boards
* Classes

---

# Testing Requirements

## Access

* Logged-out access redirects to login.
* Administrator aliases can access Subjects.
* Unsupported roles cannot.

## Institute Isolation

Where applicable:

* Only current institute Subjects are listed.
* Cross-institute records cannot be viewed or edited.
* Browser cannot spoof institute ID.

## Validation

Test all actual persisted fields.

At minimum:

* Empty Subject Name rejected.
* Whitespace-only Subject Name rejected.
* Subject Name trimmed.
* Duplicate Subject Name handled.

## UI

* Search works.
* Empty state works.
* No-results state works.
* Create dialog works.
* View dialog works.
* Edit dialog works.
* Desktop layout works.
* Mobile layout works.
* Toast feedback works.

## Regression

Verify:

* Authentication
* Dashboard
* Academic Years
* School Boards
* Classes
* Batches remains Coming Soon

---

# Verification Commands

Run:

* `npm.cmd run lint`
* `npx.cmd tsc --noEmit`
* `npm.cmd run build`
* `git diff --check`

Then review:

* `git status`
* `git diff`

Do not commit or push until explicitly approved.

---

# Acceptance Criteria

Module 03D is complete when:

* `/masters/subjects` works.
* Administrator authorization is enforced.
* Subjects can be listed.
* Subjects can be created.
* Subjects can be viewed.
* Subjects can be edited.
* Search works.
* Only schema-supported fields are used.
* No unsupported Class, Board, Academic Year, or Batch relationship is invented.
* Existing modules continue to work.
* Subjects navigation is enabled.
* Batches remains disabled.
* No unapproved database change is made.
* Lint passes.
* TypeScript passes.
* Production build passes.
* `git diff --check` passes.

---

# Implementation Workflow

Before coding:

1. Read `AGENTS.md`.
2. Read all framework files inside `.codex/`.
3. Read this module specification.
4. Inspect the live Subjects schema.
5. Search existing code for Subject-related implementations.
6. Inspect database relationships and constraints.
7. Compare the live schema with this specification.
8. Identify reusable patterns from School Boards and Classes.
9. Produce an implementation plan.
10. Wait for approval.

Do not modify files during analysis.

After approval:

1. Implement only the schema-compatible approved scope.
2. Preserve unrelated code.
3. Run verification commands.
4. Review the final diff.
5. Report created, modified, and removed files.
6. Report database/security follow-ups separately.

Do not commit or push.

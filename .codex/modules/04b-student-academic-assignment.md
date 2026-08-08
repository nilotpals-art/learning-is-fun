# Module 04B – Student Academic Assignment

## Status

Planned

---

# Objective

Implement Student Academic Assignment for Learning Is Fun ERP.

This module manages a Student’s academic placement over time.

Student Master remains permanent personal/administrative data.

Academic Assignment must preserve historical changes such as:

* Academic Year changes
* School changes
* Board changes
* Class changes
* Batch changes

Do not overwrite historical placement.

---

# Access

Administrator only for create/change operations.

Students and Parents may later receive read-only access.

Students and Parents must never be allowed to change academic assignments or batches.

---

# Approved Fields

Student Academic Assignment must contain:

* Academic Year
* School Name
* School Board
* Class
* Batch
* Effective From
* Effective To — Optional

Do NOT include:

* School Roll Number

---

# Student Relationship

Every Academic Assignment belongs to one Student.

Student must:

* belong to the authenticated institute;
* exist;
* be accessible to the administrator.

Never trust a browser-supplied Student ID without institute validation.

---

# Academic Year

Required.

Academic Year must:

* belong to the authenticated institute;
* be active where business rules require;
* be validated server-side.

Academic Year is part of the assignment, not Student Master.

---

# School Name

Required.

School Name must support a searchable combobox.

User experience:

1. Search existing School names.
2. Select an existing School.
3. If no matching School exists, allow typing a new School name.
4. Show an action such as:

`+ Add "School Name"`

5. Create the new School safely.
6. Select the newly created School automatically.

School creation must be institute-scoped.

Before implementing create-if-missing behavior:

* inspect the live `schools` table;
* inspect existing duplicates;
* inspect uniqueness constraints;
* inspect RLS;
* determine whether safe case-insensitive creation is possible.

Do not create duplicate School records.

If the existing duplicate School problem prevents safe create-if-missing behavior, stop and propose cleanup/constraint changes before enabling School creation.

---

# School Board

Required.

Selected Board must:

* belong to the authenticated institute;
* exist;
* be validated server-side.

Do not assume School Board from School unless the live schema and approved business rule require that relationship.

If `schools.board_id` exists, inspect whether selecting a School should automatically restrict or preselect Board.

Do not invent behavior before schema review.

---

# Class

Required.

Selected Class must:

* belong to the authenticated institute;
* exist;
* be validated server-side.

Do not connect Class directly to Academic Year unless existing schema explicitly requires it.

---

# Batch

Required.

Selected Batch must:

* belong to the authenticated institute;
* exist;
* match the selected academic context according to the live schema.

Inspect whether Batch already references:

* Board
* Class
* Subject

If Batch has Board/Class relationships, use those relationships to prevent incompatible selections.

Do not create new database relationships unless approved.

---

# Batch Change Business Rule

Critical:

Students and Parents cannot change Batch.

Only Administrator may change Batch.

Batch changes must preserve history.

Example:

Previous assignment:

* Academic Year: 2026–27
* School: ABC School
* Board: CBSE
* Class: V
* Batch: A
* Effective From: 01-Apr-2026
* Effective To: 31-Aug-2026

New assignment:

* Academic Year: 2026–27
* School: ABC School
* Board: CBSE
* Class: V
* Batch: B
* Effective From: 01-Sep-2026
* Effective To: NULL

Do not overwrite Batch A with Batch B.

Close the old assignment and create a new assignment.

---

# Effective From

Required.

Represents the date the assignment became valid.

Validation:

* valid date;
* must not overlap another assignment for the same Student.

---

# Effective To

Optional.

NULL means current/open assignment.

Rules:

* must be on or after Effective From;
* historical assignments should have an Effective To date;
* only one current/open assignment should exist for a Student unless the approved schema explicitly supports multiple concurrent assignments.

---

# History Preservation

Academic Assignment is historical data.

Never:

* overwrite old academic placement;
* delete old assignments casually;
* destroy previous Batch history.

Changing:

* School
* Board
* Class
* Batch
* Academic Year

should normally create a new assignment and close the previous one.

---

# Current Assignment

The module should clearly identify the current assignment.

Recommended rule:

Current Assignment = assignment with:

`effective_to IS NULL`

If the live schema uses another current-state mechanism, inspect and report it first.

---

# Module 04A Integration

Student Master must remain unchanged.

Student profile may later display:

Current Academic Assignment

and:

Academic History

but Module 04B owns the data.

Do not move Academic Assignment fields back into `students`.

---

# Live Schema Audit Required

Before implementation inspect:

* `student_academics`
* `student_batches`
* `schools`
* `boards`
* `academic_classes`
* `batches`
* `academic_years`

Report:

* actual columns;
* foreign keys;
* delete behavior;
* indexes;
* unique constraints;
* RLS;
* existing data;
* current-state fields;
* effective date support;
* assignment overlap enforcement.

Determine whether one or both Student academic tables should remain part of the final model.

---

# Existing Known Schema Issues

Previous audits found:

* `student_academics` stores School, Board, Class and Academic Year.
* `student_batches` stores Student, Batch, Academic Year and date/history concepts.
* Neither table alone supports the entire approved Module 04B model.
* `student_batches.student_id` FK was later added.
* School duplicates currently exist.
* Schools do not yet have safe case-insensitive uniqueness.

Reinspect the live schema because migrations may have changed it.

Do not rely only on old audit results.

---

# Target Data Model

Prefer one authoritative assignment/history model if safely achievable.

The target business record concept is:

Student Academic Assignment

* student_id
* institute_id where appropriate
* academic_year_id
* school_id
* board_id
* class_id
* batch_id
* effective_from
* effective_to
* timestamps

Do not create this table automatically.

First determine whether the current tables can be safely aligned or whether a new normalized assignment table is justified.

If schema change is required:

STOP.

Provide:

* gap analysis;
* minimal target schema;
* migration SQL;
* rollback SQL;
* data-loss assessment;
* migration strategy.

Wait for approval.

---

# Assignment Overlap Rule

A Student must not have overlapping academic assignments.

Example invalid:

Assignment 1:
01-Apr-2026 → 30-Sep-2026

Assignment 2:
01-Aug-2026 → NULL

The date ranges overlap.

This must be prevented by database integrity where practical, not only UI checks.

If PostgreSQL exclusion constraints or another safe mechanism is appropriate, propose it during the schema review.

Do not silently rely only on JavaScript.

---

# One Current Assignment

There should normally be at most one assignment with:

`effective_to IS NULL`

per Student.

Prefer database enforcement if the schema is redesigned.

---

# Changing Assignment

Administrator action:

**Change Academic Assignment**

Recommended flow:

1. Load current assignment.
2. Administrator enters new Effective From.
3. Select/change:

   * Academic Year
   * School
   * Board
   * Class
   * Batch
4. Validate new values.
5. Close previous assignment with:
   `effective_to = new_effective_from - 1 day`
   where that rule is appropriate.
6. Create new assignment.
7. Perform both operations atomically.
8. Refresh Student academic history.

Do not leave a gap/overlap accidentally.

If same-day transitions need special handling, use clear date-boundary rules.

---

# Initial Assignment

A Student created in Module 04A does not yet have the academic assignment persisted there.

Module 04B should support:

**Assign Student**

for a Student with no current academic assignment.

Use the existing Student and Admission Date as context, but do not assume the assignment Effective From must equal Admission Date unless explicitly selected/approved.

---

# School Create-if-Missing

Before enabling:

`+ Add New School`

the School uniqueness issue must be addressed.

The module must never create:

* `ABC School`
* `abc school`
* `ABC School`

as separate records within the same institute.

If existing duplicates must be cleaned before adding normalized uniqueness, propose the cleanup separately and wait for approval.

---

# UI Routes

Recommended primary route:

`/students/academic-assignments`

Optionally integrate assignment actions into Student View later.

Do not overcrowd `/students`.

A Student detail action may navigate to or open Academic Assignment management.

---

# Main Page

Page title:

**Student Academic Assignments**

Subtitle:

**Manage school, board, class and batch history for students.**

Theme:

Royal Blue / Indigo, consistent with Students.

---

# List

Recommended fields:

* Student
* Admission Number
* Academic Year
* School
* Board
* Class
* Batch
* Effective From
* Effective To / Current
* Actions

Support responsive desktop table and mobile cards.

---

# Search

Support search by:

* Student Name
* Admission Number
* School
* Board
* Class
* Batch

Avoid N+1 queries.

---

# Filters

Useful filters:

* Academic Year
* School
* Board
* Class
* Batch
* Current / Historical

Only implement filters that are supported cleanly by the final data model.

---

# Summary Cards

Recommended:

* Students with Current Assignment
* Students Without Assignment
* Current Assignments
* Historical Assignments

All institute-scoped.

---

# Actions

For Student with no assignment:

* Assign Student

For Student with current assignment:

* View
* Change Assignment

For historical assignment:

* View

Do not implement hard delete.

---

# Assignment Form

Fields:

* Student — selected/contextual
* Academic Year
* School Name
* School Board
* Class
* Batch
* Effective From

Effective To should normally be managed by history transition rather than manually entered on initial/current assignment.

For exceptional history corrections, support only if specifically justified.

---

# Cascading UX

Where supported by schema:

* Selecting School may preselect Board.
* Selecting Board may filter available Batches.
* Selecting Class may filter Batches.
* Batch dropdown should show only compatible values.

Do not rely on frontend filtering alone.

Server-side validation must verify selected relationships.

---

# Validation

Every foreign key must be validated server-side against the authenticated institute.

Validate:

* Student
* Academic Year
* School
* Board
* Class
* Batch

Reject cross-institute IDs.

Reject inactive records where existing business rules require active choices.

---

# Authorization

Only Administrator can:

* create initial assignment;
* change assignment;
* change Batch;
* close assignments.

Future Student and Parent access:

Read-only.

Do not implement those portals in Module 04B.

---

# RLS

Inspect all assignment-related tables.

If final implementation uses a new/changed table:

* enable RLS;
* Administrator policies only for now;
* no Student/Parent mutation policies;
* no anon access.

Do not weaken existing RLS.

---

# Delete Rules

Do not hard-delete academic assignment history.

If an incorrect assignment requires correction, implement an explicit correction flow later.

Historical records should remain auditable.

---

# Audit / Timestamps

Use created/updated timestamps where available.

If actor/audit columns do not exist, do not invent them in application state.

A future Audit Log module may record these operations.

---

# Module 04B Acceptance Criteria

Complete when:

* Administrator can assign a Student academically.
* Academic Year works.
* School works.
* Board works.
* Class works.
* Batch works.
* School can safely be selected.
* New School creation works only if uniqueness is safely enforced.
* Current assignment is clearly identifiable.
* Administrator can change Batch/assignment.
* Previous assignment history remains preserved.
* No overlapping assignments.
* At most one current assignment per Student.
* Students/Parents cannot mutate assignments.
* Cross-institute IDs are rejected.
* No hard delete exists.
* Module 04A continues working.
* Lint passes.
* TypeScript passes.
* Build passes.
* `git diff --check` passes.

---

# Implementation Workflow

Before coding:

1. Read `AGENTS.md`.
2. Read all `.codex/` files.
3. Read this specification.
4. Reinspect live assignment-related schema.
5. Audit School duplicate issue.
6. Compare existing tables with the approved target.
7. Determine whether schema alignment is required.
8. Produce a detailed plan.
9. Stop if migration is required.
10. Wait for approval.

Do not modify files during analysis.

Do not commit or push.

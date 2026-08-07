# Module 03B – School Boards

## Status

Planned

---

# Objective

Implement the School Boards master module for Learning Is Fun ERP.

This module will follow the same architecture, coding standards, UI patterns, and Server Action approach established in Module 03A – Academic Years.

Do not redesign the architecture.

Reuse the existing CRUD patterns wherever applicable.

---

# Existing Business Context

School Boards represent educational boards such as:

* CBSE
* ICSE
* ISC
* WBBSE
* WBCHSE
* IB
* Cambridge

Each board belongs to an institute.

The implementation must inspect the existing database schema before coding.

Do not assume columns.

Do not modify the database schema.

---

# User Roles

Administrator only.

Students and Parents have no access.

---

# Functional Requirements

## School Boards List

Route:

`/masters/school-boards`

Display:

* Board Name
* Description
* Display Order
* Status
* Actions

Actions:

* View
* Edit
* Activate
* Deactivate

Do not implement hard delete.

---

# Create School Board

Administrator can create a School Board.

Fields:

* Board Name (Required)
* Description (Optional)
* Display Order (Optional)
* Active (Boolean)

---

# Edit School Board

Administrator can edit:

* Board Name
* Description
* Display Order
* Active

---

# Validation Rules

Use Zod.

## Board Name

* Required
* Trim whitespace
* Cannot be empty
* Must be unique within the authenticated institute

## Description

* Optional

## Display Order

* Optional
* Numeric
* Must be zero or greater

## Active

* Boolean

Validation must always run server-side.

---

# Business Rules

* Administrator only.
* Institute-scoped data.
* Institute ID must come from the authenticated profile.
* Never accept institute_id from the browser.
* No hard delete.
* Active/Inactive controls availability.

---

# Database Rules

Before implementation inspect:

* school_boards table
* constraints
* indexes
* foreign keys
* RLS state
* existing services
* existing routes

Do not:

* create tables
* rename columns
* create migrations
* enable RLS
* create triggers
* create functions
* modify constraints

without explicit approval.

---

# Security

Every query and mutation must:

* Validate authentication
* Validate administrator role
* Derive institute_id server-side
* Scope every query to the authenticated institute
* Validate input with Zod
* Return friendly errors

Never expose service-role credentials.

---

# Architecture

Reuse Module 03A.

Reuse:

* folder structure
* Server Actions
* services
* validation
* dialogs
* confirmation dialogs
* loading states
* empty states
* search/filter architecture
* responsive table
* summary cards
* toast notifications

Do not duplicate architecture.

---

# UI Requirements

Page title:

School Boards

Subtitle:

"Manage education boards available within your institute."

Primary button:

Add School Board

---

# Summary Cards

Display:

* Total Boards
* Active Boards
* Inactive Boards

Use placeholder counts only when no records exist.

---

# Search & Filters

Include:

Search

Status Filter:

* All
* Active
* Inactive

---

# Table

Columns:

* Board Name
* Description
* Display Order
* Status
* Actions

Status badges:

* Active
* Inactive

---

# Dialogs

Reusable dialog for:

* Add School Board
* Edit School Board

Confirmation dialog for:

* Deactivate School Board

---

# Empty State

Display:

"No School Boards have been created yet."

Primary action:

Add School Board

---

# Error Handling

Provide friendly messages for:

* Duplicate Board Name
* Validation errors
* Unauthorized access
* Database failures

Do not expose PostgreSQL errors.

---

# Navigation

Enable only:

Masters

* Academic Years
* School Boards

Keep:

* Classes
* Subjects
* Batches

disabled with Coming Soon.

---

# Testing

Verify:

Access

* Administrator allowed
* Logged-out redirected
* Unsupported roles blocked

CRUD

* Create
* Edit
* Activate
* Deactivate

Validation

* Empty name
* Duplicate name
* Invalid display order

UI

* Responsive layout
* Search
* Filters
* Empty state
* Loading state
* Success/error toasts

---

# Verification Commands

Run:

* npm.cmd run lint
* npx.cmd tsc --noEmit
* npm.cmd run build
* git diff --check

Review:

* git status
* git diff

Do not commit or push.

---

# Deliverables

Provide:

* Files created
* Files modified
* Files removed
* Build result
* Test summary
* Remaining risks
* Recommended next module

---

# Acceptance Criteria

Module 03B is complete when:

* `/masters/school-boards` works.
* School Boards can be created.
* School Boards can be edited.
* Active status can be changed.
* Institute scoping is enforced.
* Existing Authentication remains intact.
* Existing Dashboard remains intact.
* Existing Academic Years remains intact.
* School Boards navigation is enabled.
* Other Masters remain disabled.
* No database schema changes were made.
* Lint passes.
* TypeScript passes.
* Production build passes.
* git diff --check passes.

---

# Implementation Workflow

Before writing code:

1. Read AGENTS.md.
2. Read all .codex framework files.
3. Read this module specification.
4. Inspect the existing School Boards schema.
5. Inspect any existing School Boards implementation.
6. Identify reusable components from Module 03A.
7. Produce an implementation plan.
8. Wait for approval.

After approval:

1. Implement only the approved scope.
2. Preserve unrelated code.
3. Run verification commands.
4. Review the final diff.
5. Report all created, modified, and removed files.

Do not commit or push.

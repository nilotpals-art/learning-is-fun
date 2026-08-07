# Module 03A – Academic Years

## Status

Planned

---

# Objective

Implement the Academic Years master module for Learning Is Fun ERP.

This module will become the reference pattern for future CRUD-based master modules.

The implementation must integrate with the existing Supabase schema and current Dashboard/Application Shell without recreating or changing database tables unless explicitly approved.

---

# Existing Business Context

The system supports one institute with multiple branches.

Academic Years belong to the institute.

The existing `academic_years` table is the source of truth.

Expected existing fields include:

* `id`
* `institute_id`
* `name`
* `start_date`
* `end_date`
* `is_current`
* `is_active`
* `created_at`
* `updated_at`

Codex must inspect the actual live schema before implementation and must not assume additional columns exist.

---

# User Roles

For this module:

## Administrator

Can:

* View Academic Years
* Create Academic Year
* Edit Academic Year
* Activate or deactivate Academic Year
* Mark an Academic Year as current

Student and Parent access is not required in this module.

---

# Functional Requirements

## Academic Year List

Create a protected page for Academic Years.

Recommended route:

`/masters/academic-years`

Display:

* Academic Year Name
* Start Date
* End Date
* Current Status
* Active Status
* Actions

Actions:

* View
* Edit
* Activate / Deactivate
* Set as Current

Do not implement hard delete unless the existing business rules and database constraints explicitly allow it.

Prefer soft deactivation through `is_active`.

---

# Create Academic Year

Administrator can create a new Academic Year.

Required fields:

* Name
* Start Date
* End Date
* Active Status

Optional current-year selection may be provided if the business rules can be enforced safely.

---

# Edit Academic Year

Administrator can update:

* Name
* Start Date
* End Date
* Active Status

Current-year state must be handled through the dedicated current-year workflow.

---

# Current Academic Year

Only one Academic Year should be current for the same institute at a time.

When an Administrator sets a year as current:

1. Validate authorization.
2. Validate that the Academic Year belongs to the authenticated user's institute.
3. Unset the previous current Academic Year for that institute.
4. Mark the selected Academic Year as current.
5. Ensure the operation cannot leave multiple current years.

Before implementing this behavior, inspect whether the database already enforces this rule through:

* constraints;
* indexes;
* triggers;
* functions;
* existing Server Actions.

Do not create a migration without approval.

---

# Validation Rules

Use Zod.

## Name

* Required
* Trim whitespace
* Must not be empty
* Reject obvious duplicate names for the same institute where possible

## Start Date

* Required
* Valid date

## End Date

* Required
* Valid date
* Must be later than Start Date

## Active Status

* Boolean

## Current Status

* Boolean
* Must respect the single-current-year business rule

Validation must run server-side even if client-side validation also exists.

---

# Database Rules

The existing Supabase schema is authoritative.

Before implementation, inspect:

* `academic_years`
* `institutes`
* relevant foreign keys
* indexes
* constraints
* RLS policies
* existing academic-year services/actions
* existing API routes, if any

Do not:

* recreate `academic_years`;
* rename columns;
* delete columns;
* add migrations;
* change RLS;
* change constraints;

without explicit approval.

---

# Institute Scoping

All Academic Year queries and mutations must be scoped to the authenticated user's institute.

Do not trust `institute_id` supplied by the browser.

The server must derive institute identity from the authenticated profile/session.

A user from one institute must not be able to read or mutate another institute's Academic Years.

---

# Security

Every Academic Year mutation must validate:

* authenticated session;
* active profile;
* administrator role;
* institute ownership;
* input validation.

Do not rely on hidden fields or client-side role checks.

Do not expose service-role credentials.

Respect the existing Authentication architecture.

---

# Server Architecture

Prefer Server Actions for Academic Year CRUD operations.

Reuse existing project patterns if they already exist.

Recommended responsibilities:

* list Academic Years;
* get Academic Year;
* create Academic Year;
* update Academic Year;
* toggle active state;
* set current Academic Year.

Do not introduce unnecessary API routes.

If legacy Academic Year API routes already exist, inspect them first and recommend whether they should remain, be reused, or be migrated.

Do not delete working legacy routes without approval.

---

# UI Requirements

The page should fit inside the existing Module 02 application shell.

Use existing:

* Button
* Card
* Dialog
* Input
* Table
* Badge
* Select
* Toast
* Empty State patterns

Do not create duplicate generic UI components.

---

# Page Header

Display:

**Academic Years**

Subtitle example:

“Manage academic sessions and select the current academic year.”

Primary action:

**Add Academic Year**

---

# Academic Year Table

Support:

* Search
* Status filter
* Sorting where appropriate
* Responsive layout
* Loading state
* Empty state

Columns:

* Name
* Start Date
* End Date
* Current
* Status
* Actions

Use badges for:

* Current
* Active
* Inactive

---

# Add / Edit Experience

Prefer a reusable dialog or form component.

Fields:

* Academic Year Name
* Start Date
* End Date
* Active

For setting the current year, use a clear dedicated action rather than burying the behavior inside an ambiguous checkbox if that results in safer UX.

---

# Confirmation UX

Require confirmation before:

* Deactivating an Academic Year
* Changing the current Academic Year

The confirmation message should explain the consequence clearly.

---

# Empty State

If there are no Academic Years:

Display a helpful empty state such as:

“No academic years have been created yet.”

Provide:

**Add Academic Year**

---

# Error Handling

Provide friendly messages for:

* Duplicate Academic Year
* Invalid date range
* Unauthorized access
* Failed database operation
* Current-year conflict
* Unexpected server error

Do not expose raw database errors to the user.

---

# Navigation Integration

Update the Masters → Academic Years navigation item.

Once this module is completed:

* `Academic Years` should no longer point to a generic Coming Soon destination.
* It should point to `/masters/academic-years`.
* It should become enabled.

Do not enable the other unfinished Masters items yet.

---

# Reusability

This module should establish reusable patterns for future Masters modules.

Where sensible, create reusable patterns for:

* Master page headers
* Status badges
* CRUD dialogs
* Confirmation dialogs
* Search/filter controls
* Server Action result types

Do not over-generalize prematurely.

Only extract shared abstractions when they are genuinely reusable.

---

# Testing Requirements

Test:

## Access

* Administrator can access the page.
* Logged-out user is redirected.
* Unsupported role cannot access the page.

## List

* Academic Years load for the correct institute.
* Another institute's records are not exposed.
* Empty state works.

## Create

* Valid Academic Year succeeds.
* Missing name fails.
* Invalid date range fails.
* Duplicate name is handled.
* Institute ID cannot be spoofed from the client.

## Edit

* Valid update succeeds.
* Unauthorized record update fails.
* Date validation still applies.

## Current Year

* Setting a year as current succeeds.
* Previous current year is unset.
* Only one current year remains.
* Cross-institute mutation is impossible.

## Active Status

* Active → inactive works.
* Inactive → active works.

## UI

* Dialogs open and close correctly.
* Loading states work.
* Success feedback works.
* Error feedback works.
* Responsive layout works.

---

# Verification Commands

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

Module 03A is complete when:

* `/masters/academic-years` works.
* Academic Years can be listed.
* Academic Years can be created.
* Academic Years can be edited.
* Active status can be changed.
* Current Academic Year can be safely selected.
* Institute scoping is enforced server-side.
* Existing Authentication remains intact.
* Existing Dashboard remains intact.
* Academic Years navigation is enabled.
* Other Masters remain disabled.
* No schema change was made without approval.
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
4. Inspect the existing Academic Years code.
5. Inspect the live Supabase schema.
6. Identify reusable components and services.
7. Identify legacy Academic Year routes/services.
8. Produce an implementation plan.
9. Wait for approval.

After approval:

1. Implement only the approved scope.
2. Preserve unrelated working code.
3. Run verification commands.
4. Review the final diff.
5. Report all created, modified, and removed files.
6. Report any security/database follow-up separately.

Do not commit or push.

# Module 03E – Batches

## Status

Planned

---

# Objective

Implement the Batches master module for Learning Is Fun ERP.

Batches represent the actual teaching groups used by the institute.

Examples:

* Class I - A
* Class I - B
* Class II - A
* Evening Batch
* Weekend Batch

The implementation must strictly follow the live database schema.

Do not invent relationships.

---

# Business Model

A Batch is a reusable academic grouping.

It may reference:

* Class
* Board
* Subject

only if those relationships already exist in the live schema.

Academic Year must only be connected if the database already models it.

Do not introduce new relationships.

---

# Initial Requirement

Before implementation inspect the live Supabase schema.

Determine:

* actual table name
* columns
* data types
* nullability
* defaults
* primary key
* foreign keys
* indexes
* unique constraints
* RLS status
* existing data
* relationships

The live schema is the source of truth.

---

# Access

Administrator only.

---

# Institute Scoping

If batches are institute-scoped:

* derive institute ID from the authenticated profile
* never accept institute ID from browser input
* filter by institute
* scope updates by institute + UUID

If batches are global, report it before implementation.

---

# Functional Scope

Subject to the schema:

* List Batches
* View Batch
* Create Batch
* Edit Batch
* Search

Delete Rules

Batches may be permanently deleted only when they are not referenced by any related records.

Before deletion:

- Check all existing foreign-key relationships.
- If references exist, prevent deletion and show a friendly error.
- If no references exist, require a confirmation dialog before permanently deleting the Batch.

The confirmation dialog should clearly state that the action cannot be undone.

Do not implement soft delete unless the database schema already requires it.

Only implement fields that actually exist.

---

# Validation

Use Zod.

Validate only persisted fields.

If a Batch Name exists:

* required
* trimmed
* non-whitespace

Handle duplicate names according to the existing database constraints.

If no unique constraint exists, perform an application-level duplicate check and report that it is not race-proof.

---

# Architecture

Reuse the existing Masters architecture:

* Server Actions
* server-only services
* Zod validation
* institute scoping
* discriminated action results
* responsive manager
* dialogs
* loading
* empty state
* search
* toast feedback

Do not introduce a generic CRUD engine.

---

# UI

Route:

/masters/batches

Page title:

Batches

Subtitle:

Manage teaching batches within your institute.

Primary action:

Add Batch

Table fields must match the schema exactly.

---

# Navigation

Enable:

* Academic Years
* School Boards
* Classes
* Subjects
* Batches

Leave Fee Heads and Payment Modes disabled.

---

# Security

Every operation must:

* require authenticated administrator
* derive institute server-side
* scope records correctly
* validate inputs server-side
* avoid service-role credentials

---

# Database Rules

Do not:

* create tables
* modify schema
* create migrations
* enable RLS
* add triggers
* add RPCs
* change constraints

without explicit approval.

---

# Verification

Run:

* npm.cmd run lint
* npx.cmd tsc --noEmit
* npm.cmd run build
* git diff --check

Do not commit or push.

---

# Workflow

Before writing code:

1. Read AGENTS.md.
2. Read all `.codex/` files.
3. Read this specification.
4. Inspect the live Batches schema.
5. Search for existing Batch-related code.
6. Produce an implementation plan.
7. Wait for approval.

Do not modify files during analysis.

# .codex/module-template.md

# Learning Is Fun ERP - Module Template

## Module Information

**Module Name:**

**Version:**

**Status:** Planned / In Progress / Completed

---

# Objective

Describe the purpose of this module.

Explain the business problem it solves.

---

# Business Requirements

* Requirement 1
* Requirement 2
* Requirement 3

---

# User Roles

Specify which roles can access this module.

Example:

* Administrator
* Student
* Parent

---

# Functional Requirements

List all functional requirements.

Example:

* Create
* Update
* Delete
* View
* Search
* Filter
* Export

---

# Validation Rules

Describe all validation rules.

Use:

* React Hook Form
* Zod

Validate on both client and server.

---

# Database

Before implementation:

* Inspect the existing Supabase schema.
* Reuse existing tables.
* Reuse existing relationships.

Do not recreate tables.

Do not modify the schema without approval.

---

# User Interface

Define:

* Pages
* Forms
* Tables
* Dialogs
* Loading States
* Empty States
* Error States

Reuse existing components whenever possible.

---

# Security

Validate:

* Authentication
* Authorization
* User Role
* Ownership

Never trust client-side validation.

---

# Implementation Workflow

Before writing code:

1. Read AGENTS.md
2. Read all files in .codex/
3. Analyze the project.
4. Inspect reusable components.
5. Inspect existing Server Actions.
6. Produce an implementation plan.
7. Wait for approval.

After approval:

1. Implement the approved scope.
2. Run the build.
3. Fix TypeScript errors.
4. Fix ESLint errors.
5. Verify functionality.

---

# Deliverables

Provide:

* Files created
* Files modified
* Build status
* Test summary
* Remaining issues
* Recommended next step

---

# Acceptance Criteria

The module is complete when:

* All requirements are implemented.
* Build succeeds.
* No TypeScript errors.
* No ESLint errors.
* No unrelated files were modified.
* Feature has been tested.

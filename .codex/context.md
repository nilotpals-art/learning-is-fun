# Learning Is Fun ERP - Project Context

## Project Status

Status: Active Development

Current Phase: Foundation Complete

Next Phase: Module 01 - Authentication

---

# Project Purpose

Learning Is Fun ERP is a cloud-based ERP for managing an English tutorial institute.

The system is designed to provide secure, scalable, and maintainable management of students, parents, academics, attendance, homework, examinations, fees, and reporting.

---

# Current Technology Stack

## Frontend

* Next.js 16 (App Router)
* React
* TypeScript
* Tailwind CSS

## Backend

* Supabase
* PostgreSQL

## Validation

* React Hook Form
* Zod

## Deployment

* Vercel

---

# Authentication Strategy

Authentication must use:

* Email + OTP

Rules:

* No passwords
* No public registration
* Only administrator-authorized users can log in
* Only active users may authenticate
* Role-based authorization is mandatory

---

# Existing Database

The Supabase database already exists.

The database is the source of truth.

Before implementing any feature:

* Inspect the existing schema.
* Reuse existing tables.
* Reuse existing relationships.

Never:

* Recreate tables.
* Rename tables.
* Delete tables.
* Modify the schema without explicit approval.

---

# User Roles

* Administrator
* Student
* Parent

Each role has its own dashboard, permissions, and navigation.

---

# Coding Philosophy

Always:

* Reuse existing components.
* Reuse existing utilities.
* Prefer Server Components.
* Use Server Actions where appropriate.
* Follow strict TypeScript.
* Keep code modular and maintainable.
* Avoid duplicate logic.

---

# Project Conventions

* Do not modify unrelated files.
* Keep changes focused on the requested module.
* Follow the existing folder structure.
* Maintain consistent naming conventions.
* Prefer composition over duplication.

---

# Development Workflow

For every module:

1. Read AGENTS.md.
2. Read all files in `.codex/`.
3. Analyze the project.
4. Produce an implementation plan.
5. Wait for approval.
6. Implement the approved scope.
7. Run the build.
8. Resolve TypeScript and ESLint issues.
9. Summarize all changes.

---

# Modules

Implementation order:

1. Authentication
2. Dashboard
3. Masters
4. Academic Years
5. School Boards
6. Classes
7. Subjects
8. Batches
9. Students
10. Parents
11. Attendance
12. Homework
13. Examinations
14. Marks
15. Report Cards
16. Fees
17. Announcements
18. Reports
19. Settings

---

# Definition of Success

Every completed module must:

* Meet the functional requirements.
* Build successfully.
* Have no TypeScript errors.
* Have no ESLint errors.
* Preserve existing functionality.
* Respect the existing Supabase schema.
* Include a summary of all created and modified files.

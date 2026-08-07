# Learning Is Fun ERP

## Project Overview

Learning Is Fun ERP is a modern, cloud-based Enterprise Resource Planning (ERP) system built for an English tutorial institute.

The application is designed to manage the complete academic and administrative workflow of the institute using a secure, scalable, and maintainable architecture.

---

# Vision

Build a production-ready ERP that is:

* Secure
* Scalable
* Modular
* Maintainable
* Fast
* User-friendly

The application should follow enterprise software engineering practices and avoid temporary or prototype solutions.

---

# Technology Stack

## Frontend

* Next.js 16 (App Router)
* React
* TypeScript
* Tailwind CSS

## Backend

* Supabase
* PostgreSQL
* Server Actions

## Validation

* React Hook Form
* Zod

## Deployment

* Vercel

## Version Control

* Git
* GitHub

---

# User Roles

The application supports the following roles:

## Administrator

Responsible for complete ERP management.

Can:

* Manage users
* Manage masters
* Manage students
* Manage parents
* Manage attendance
* Manage homework
* Manage examinations
* Manage marks
* Manage fees
* Publish announcements
* Generate reports
* Configure settings

---

## Student

Can:

* View dashboard
* View attendance
* View homework
* View examinations
* View marks
* View report cards
* View announcements

Students cannot modify academic records.

---

## Parent

A single parent account may be linked to multiple students.

Parents can:

* View linked students
* View attendance
* View homework
* View examinations
* View marks
* View report cards
* View announcements

Parents cannot modify academic records.

---

# Authentication

Authentication uses:

* Supabase Auth
* Email + OTP

Rules:

* No passwords
* No public registration
* Only administrator-authorized users may log in
* Only active users may authenticate

---

# Core Modules

1. Authentication
2. Dashboard
3. Academic Years
4. School Boards
5. Classes
6. Subjects
7. Batches
8. Students
9. Parents
10. Attendance
11. Homework
12. Examinations
13. Marks
14. Report Cards
15. Fees
16. Announcements
17. Reports
18. Settings

---

# Development Principles

Every implementation must:

* Reuse existing components.
* Reuse existing utilities.
* Use Server Actions where appropriate.
* Avoid duplicate code.
* Keep modules independent.
* Follow strict TypeScript.
* Respect the existing Supabase schema.
* Never modify unrelated files.

---

# Database Principles

The existing Supabase database is the source of truth.

Codex must:

* Inspect the existing schema before implementation.
* Never recreate existing tables.
* Never rename existing tables.
* Never delete existing tables.
* Never modify the schema without explicit approval.

---

# UI Principles

The interface must be:

* Responsive
* Accessible
* Consistent
* Professional
* Fast

Every page should include appropriate loading, empty, success, and error states.

---

# Development Workflow

For every module, Codex must:

1. Read `AGENTS.md`.
2. Read all files inside `.codex/`.
3. Analyze the existing project.
4. Analyze the Supabase integration.
5. Produce an implementation plan.
6. Wait for approval.
7. Implement only the approved scope.
8. Run the build.
9. Resolve TypeScript and ESLint issues.
10. Summarize all changes.

---

# Definition of Done

A module is complete only when:

* Functional requirements are implemented.
* Build completes successfully.
* No TypeScript errors remain.
* No ESLint errors remain.
* Existing functionality is not broken.
* Only approved files were modified.
* A clear summary of changes is provided.

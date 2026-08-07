# AGENTS.md

# Learning Is Fun ERP - AI Development Guide

## Role

You are the Lead Software Engineer for the **Learning Is Fun ERP** project.

Your responsibility is to build production-ready software that follows the project's architecture, coding standards, and business rules.

Do not make assumptions. Analyze before implementing.

---

# Project Stack

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

## Authentication

* Supabase Auth
* Email + OTP

## Deployment

* Vercel

---

# Primary Responsibilities

For every task you must:

1. Read this file (`AGENTS.md`).
2. Read every file inside `.codex/`.
3. Inspect the existing project before making changes.
4. Reuse existing components and utilities.
5. Produce an implementation plan before coding.
6. Wait for user approval.
7. Implement only the approved scope.
8. Verify the implementation.
9. Summarize all changes.

---

# Mandatory Rules

## Code Quality

* Write production-ready code only.
* Use strict TypeScript.
* Avoid `any`.
* Keep functions small and focused.
* Follow SOLID principles where appropriate.
* Do not duplicate code.

---

## Project Rules

* Never modify unrelated files.
* Never delete working code without approval.
* Never introduce unnecessary dependencies.
* Reuse existing components whenever possible.
* Reuse existing utilities whenever possible.

---

## Database Rules

The existing Supabase database is the source of truth.

You must:

* Inspect the existing schema before implementation.
* Reuse existing tables.
* Reuse existing relationships.
* Respect Row Level Security (RLS).

Never:

* Recreate existing tables.
* Rename tables.
* Delete tables.
* Modify the schema without explicit approval.

---

## Authentication Rules

Authentication must use:

* Email + OTP

Rules:

* No passwords.
* No public registration.
* Only administrator-authorized users may log in.
* Only active users may authenticate.
* Enforce role-based authorization.

---

## UI Rules

Every feature should:

* Be responsive.
* Be accessible.
* Maintain a consistent design.
* Include loading states.
* Include empty states.
* Include success and error feedback.

---

## Development Workflow

### Phase 1 – Analyze

Before writing code:

* Inspect the project structure.
* Inspect reusable components.
* Inspect existing Server Actions.
* Inspect the Supabase integration.

Do not modify code during this phase.

---

### Phase 2 – Plan

Produce:

* Objective
* Files to create
* Files to modify
* Dependencies
* Risks
* Testing approach

Wait for approval.

---

### Phase 3 – Implement

After approval:

* Implement only the approved scope.
* Keep changes focused.
* Do not modify unrelated files.

---

### Phase 4 – Verify

Before completion:

* Run the project build.
* Resolve TypeScript errors.
* Resolve ESLint errors.
* Verify functionality.

---

### Phase 5 – Report

Provide:

* Summary of completed work.
* Files created.
* Files modified.
* Build status.
* Remaining issues.
* Recommended next step.

---

# Git Rules

Do not:

* Commit changes.
* Push changes.
* Create pull requests.

unless the user explicitly instructs you to do so.

---

# If Requirements Are Unclear

Stop and ask for clarification.

Never guess business rules or database structure.

---

# Goal

Build a secure, scalable, maintainable, and production-ready ERP for **Learning Is Fun** by completing one well-tested module at a time while preserving the integrity of the existing codebase.

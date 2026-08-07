# .codex/workflow.md

# Learning Is Fun ERP - Development Workflow

## Purpose

This workflow defines the mandatory process Codex must follow for every task.

Never skip steps.

---

# Phase 1 — Understand

Before writing any code:

* Read `AGENTS.md`
* Read `.codex/project.md`
* Read `.codex/coding-rules.md`
* Read this workflow
* Inspect the existing project structure
* Inspect the existing Supabase integration

Do not modify any files.

---

# Phase 2 — Analyze

Identify:

* Existing architecture
* Reusable components
* Existing Server Actions
* Existing utilities
* Existing authentication
* Database relationships

List anything that should be reused.

---

# Phase 3 — Plan

Produce an implementation plan containing:

* Objective
* Files to create
* Files to modify
* Dependencies
* Risks
* Testing approach

Wait for approval before writing code.

---

# Phase 4 — Implement

After approval:

* Implement only the approved scope.
* Reuse existing code whenever possible.
* Keep changes focused.
* Do not modify unrelated files.

---

# Phase 5 — Verify

Before finishing:

* Run the project build.
* Resolve TypeScript errors.
* Resolve ESLint errors.
* Verify functionality.
* Ensure no unrelated files were changed.

---

# Phase 6 — Report

Provide:

* Summary of completed work
* Files created
* Files modified
* Build status
* Remaining issues (if any)
* Suggested next step

---

# Rules

* Never recreate existing database tables.
* Never change the database schema without approval.
* Never expose secrets.
* Never commit or push code unless explicitly instructed.
* Always ask for clarification if requirements are ambiguous.

# .codex/coding-rules.md

# Learning Is Fun ERP - Coding Rules

## Technology Stack

* Next.js 16 (App Router)
* TypeScript (Strict Mode)
* Tailwind CSS
* Supabase
* PostgreSQL
* Server Actions
* React Hook Form
* Zod

---

## General Rules

* Always inspect the existing project before creating new files.
* Reuse existing components whenever possible.
* Reuse existing utilities.
* Never duplicate code.
* Never modify unrelated files.
* Keep functions small and focused.
* Write production-ready code only.

---

## TypeScript

* Use strict typing.
* Avoid `any`.
* Create reusable types.
* Prefer interfaces for shared data models.

---

## React

* Prefer Server Components.
* Use Client Components only when necessary.
* Keep components modular and reusable.

---

## Server Actions

* Prefer Server Actions over API routes where appropriate.
* Validate all input.
* Handle errors gracefully.
* Return typed responses.

---

## Supabase

* Never recreate existing tables.
* Never modify the schema without approval.
* Respect Row Level Security (RLS).
* Never expose the service role key.

---

## Authentication

* Email + OTP only.
* No passwords.
* No public registration.
* Only administrator-authorized users may log in.

---

## UI

* Responsive.
* Accessible.
* Consistent spacing and typography.
* Loading, error, success, and empty states are required.

---

## Quality

Before completing any task:

* Run the build.
* Resolve TypeScript errors.
* Resolve ESLint errors.
* Verify the requested functionality.
* Summarize all modified files.

---

## Git

Do not commit or push changes unless explicitly instructed.

Always provide a summary of:

* Files created
* Files modified
* Assumptions made
* Any remaining issues

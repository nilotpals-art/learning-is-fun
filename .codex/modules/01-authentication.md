# Module 01 – Authentication

## Status

Planned

---

# Objective

Implement a secure authentication system using the existing Supabase Auth configuration.

The implementation must integrate with the current project and existing database schema without recreating or modifying tables.

---

# Business Requirements

Authentication must use Email + OTP.

Public registration is disabled.

Only administrator-authorized users may access the system.

Users must already exist in the database before they can authenticate.

Inactive users must be prevented from signing in.

---

# User Roles

* Administrator
* Student
* Parent

Each authenticated user must be redirected to the correct dashboard according to their role.

---

# Functional Requirements

## Login

* Enter email address.
* Validate email format.
* Check that the email is authorized.
* Check that the account is active.
* Send OTP.
* Verify OTP.
* Create authenticated session.
* Load profile.
* Redirect by role.

## Logout

* End session.
* Redirect to login.

## Session

* Handle refresh.
* Handle expiration.
* Handle invalid sessions.

---

# Security Requirements

* Server-side validation is mandatory.
* Validate authentication in every protected action.
* Validate authorization in every protected action.
* Never expose the Supabase service role key.
* Respect existing RLS policies.

---

# Implementation Constraints

* Do not recreate database tables.
* Do not modify the schema.
* Reuse existing components.
* Reuse existing utilities.
* Use Server Actions where appropriate.
* Modify only files related to authentication.

---

# UI Requirements

Required screens:

* Login
* OTP Verification
* Unauthorized User
* Inactive Account
* Invalid OTP
* OTP Expired

Each screen should include:

* Loading state
* Error state
* Success feedback where appropriate

---

# Implementation Process

Before coding:

1. Read `AGENTS.md`.
2. Read all files in `.codex/`.
3. Inspect the project.
4. Inspect the Supabase authentication setup.
5. Inspect reusable components.
6. Produce an implementation plan.
7. Wait for approval.

After approval:

1. Implement only the approved scope.
2. Run the build.
3. Fix TypeScript errors.
4. Fix ESLint errors.
5. Verify functionality.

---

# Deliverables

Provide:

* Files created
* Files modified
* Build result
* Test summary
* Remaining issues
* Suggested next step

---

# Acceptance Criteria

The module is complete only when:

* Email + OTP authentication works.
* Unauthorized users are blocked.
* Inactive users are blocked.
* Role-based redirection works.
* Logout works.
* Protected routes are enforced.
* The project builds successfully.
* No TypeScript or ESLint errors remain.

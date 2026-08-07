# Module 02 – Dashboard

## Status

Planned

---

# Objective

Create the main application dashboard and reusable application shell for Learning Is Fun ERP.

The dashboard must provide a responsive layout, role-aware navigation, and reusable components that all future modules will use.

---

# Business Requirements

After successful authentication:

* Load the authenticated user profile.
* Display the user's name and role.
* Display the institute name.
* Show a responsive dashboard.
* Provide navigation to all ERP modules.

---

# User Roles

Current:

* Administrator

Future-ready:

* Student
* Parent

The layout must support role-based navigation.

---

# Layout

Create a reusable application shell consisting of:

* Sidebar
* Header
* Main Content Area
* Footer (optional)

The layout must be responsive.

---

# Sidebar

Display:

* Dashboard
* Masters
* Students
* Parents
* Attendance
* Homework
* Examinations
* Marks
* Report Cards
* Fees
* Announcements
* Reports
* Settings
* Logout

Requirements:

* Highlight active route.
* Collapse on mobile.
* Reuse existing UI components.

---

# Header

Display:

* Institute name
* Current user
* User role
* Notification placeholder
* User menu
* Logout

---

# Dashboard Content

Create placeholder widgets for:

* Total Students
* Today's Attendance
* Homework Due
* Upcoming Exams
* Pending Fees
* Recent Activity
* Quick Actions

Use placeholder data only.

Do not query modules that are not yet implemented.

---

# Navigation

Prepare routes for future modules without implementing them.

If a module is not yet available:

Display a friendly "Coming Soon" placeholder.

---

# Security

Require authentication.

Load profile server-side.

Do not expose sensitive information.

Respect role-based navigation.

---

# Implementation Constraints

* Reuse existing components.
* Reuse existing layout.
* Reuse authentication.
* Do not modify the database schema.
* Do not create unnecessary API routes.
* Use Server Components where appropriate.

---

# Acceptance Criteria

* Responsive application shell.
* Responsive sidebar.
* Working header.
* Dashboard page renders successfully.
* Role-aware navigation.
* Logout works.
* Build passes.
* No TypeScript errors.
* No ESLint errors.

---

# Deliverables

Provide:

* Files created
* Files modified
* Build result
* Test summary
* Remaining issues
* Recommended next module

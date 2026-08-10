# Learning Is Fun ERP
## Codex Implementation Prompt
### Dashboard + Sidebar Navigation Rework

Rework the existing Administrator/Student/Parent dashboard navigation and dashboard interactions so the ERP exposes only implemented, working functionality.

Do not start Examinations. Do not add placeholder modules. Do not commit or push unless explicitly instructed.

## Primary goals

1. Audit every sidebar and mobile-navigation item.
2. Audit every Dashboard Quick Action, Recent Activity item, card, metric CTA, button, View All link, and clickable widget.
3. Remove modules that are not implemented or intentionally postponed.
4. Keep Fees in scope.
5. Group the Administrator sidebar into clear functional sections.
6. Ensure Student/Parent navigation is role-specific and only exposes routes that actually exist and are authorized.
7. Remove dead links, Coming Soon links, duplicate destinations, inert buttons, misleading placeholder actions, and static fake activity.
8. Preserve all working Authentication, Masters, Students, Attendance, Learning Planner, Practice Work, and Fees business logic.

## Repository inspection first

Before editing, inspect:

- `lib/navigation.ts`
- desktop sidebar and mobile-navigation components
- Administrator dashboard page and all dashboard components
- quick-action components
- recent-activity components
- stat/metric cards and their CTA/link behavior
- role-routing/auth helpers
- all current `app/(protected)/**/page.tsx` routes
- Student portal/dashboard routes
- Parent portal/dashboard routes if present
- any `coming-soon` usage
- Fees routes/services/tables and Fee Heads/Payment Modes dependencies

Build an actual route inventory before deciding what remains.

Do not assume a link works merely because it appears in configuration.

## Hard production-navigation rule

Only show or render an interactive navigation/dashboard item when:

- its destination route exists;
- the route is implemented, not placeholder-only;
- the current role is authorized to use it;
- the feature is intentionally part of the current ERP scope;
- the action performs a real, useful operation.

Do not show `Coming Soon` navigation for postponed modules.
Do not leave buttons that visually appear clickable but do nothing.
Do not use `#`, empty hrefs, placeholder click handlers, or dead routes.

## Modules intentionally retained

Retain working functionality for:

- Dashboard
- Academic Setup / Masters
- Students / Academic Assignments
- Attendance
- Learning Planner
- Practice Work
- Fees
- Account / Logout

Fees is intentionally part of the ERP.
Retain Fee Heads and Payment Modes where required by the current Fees workflow.

If Fees is only partially implemented, keep all genuinely working Fee routes and supporting Masters, remove only broken Fee links, and report missing Fee pieces separately.

## Remove from visible production navigation unless repository inspection proves they are actively implemented and intentionally retained

- standalone Parents module
- Homework
- Examinations
- Marks
- Report Cards
- Communication
- Announcements
- generic Reports module
- Settings
- unrelated Finance placeholders

Do not delete their historical database schema/migrations merely because they are removed from navigation.

## Administrator sidebar grouping

Use grouped/collapsible sections consistent with the current sidebar architecture.

Recommended structure:

### Overview
- Dashboard

### Academic Setup
- Academic Years
- School Boards
- Classes
- Subjects
- Batches
- Fee Heads
- Payment Modes

Use either `Masters` or `Academic Setup` as the visible parent, not duplicate parallel groups.

### Student Management
- Students / Student Master
- Academic Assignments

### Attendance
- Daily Attendance
- Attendance History
- Attendance Reports

### Learning Planner
- Overview
- Calendar
- Class Schedule
- Events
- Notifications
- Schedule History

### Practice Work
- Overview
- Question Bank
- Generate Questions
- Question Templates
- Generation History
- Practice Sets
- Assignments
- Student Attempts
- Analytics

### Fees
Use either:
- a direct top-level Fees item/group; or
- a Finance parent only if that parent itself is not a broken navigable route.

Do not retain unrelated Finance placeholders.

### Account
- Logout

## Student sidebar

Expose only actual working Student destinations, expected to include where implemented:

- Dashboard
- My Practice Work
- My Schedule if a real Student route exists
- My Attendance if a real Student route exists
- My Fees only if a real authorized Student Fee route exists
- Notifications if a real Student route exists
- Logout

Do not expose Administrator routes to Students.
Do not invent links simply to make the sidebar look full.

## Parent sidebar

If the Parent dashboard is not implemented yet, do not create fake Parent feature links.
If working Parent routes exist, expose only those valid linked-child destinations.

## Administrator Dashboard rework

The dashboard must become a real operational dashboard, not a collection of static placeholders.

Focus on implemented modules:

- Students
- Attendance
- Learning Planner
- Practice Work
- Fees

Where reliable services already exist, use live data rather than hardcoded placeholder counts.
Do not invent database metrics solely for appearance.

Recommended dashboard areas:

- Active Students
- Attendance Today / attendance status
- Classes Today / Next Class
- Upcoming Planner Events
- Practice Work active/pending summary
- Fee summary / outstanding fees / recent collections only when real Fee services provide reliable values
- Recent Schedule Changes
- Recent Practice activity

Remove Exam, Homework, Marks, Report Card, generic Finance, Communication, and other postponed cards.

## Quick Actions — MUST WORK

Audit the complete Quick Actions component and every action it renders.

Every Quick Action must:

- navigate to an existing implemented route; or
- invoke a real authorized operation/dialog that works end-to-end.

Recommended Administrator Quick Actions, only where corresponding routes exist:

- Add / Manage Student
- Take Attendance
- Open Attendance Reports
- Open Learning Planner / Calendar
- Create Class Schedule or Event
- Open Practice Work
- Create Practice Set / Generate Questions if available
- Open Fees / Record or Manage Fee activity if an implemented route exists

Remove actions pointing to Homework, Examinations, Marks, Report Cards, Announcements, generic Finance, Settings, or Coming Soon pages.

Do not keep a Quick Action just because it was in the original dashboard.

For each retained Quick Action, verify:

1. href/action target exists;
2. current role is authorized;
3. clicking reaches the intended working screen/action;
4. active/error/loading behavior is sensible;
5. mobile and desktop both work.

## Recent Activity — MUST BE REAL AND CLICKABLE

Audit the existing Recent Activity component.

Do not display fake/static demo activity as if it were live data.

Where current services/data allow it, derive recent activity from implemented modules such as:

- recent Student admission/profile activity;
- recent Attendance activity/corrections;
- recent Learning Planner schedule changes/reschedules/cancellations;
- recent Practice Work publication/assignments/completed attempts;
- recent Fee activity if reliable Fee data/services already exist.

Each activity row should contain where meaningful:

- clear activity label;
- relevant entity/context;
- date/time;
- stable database ID as React key;
- a valid detail/list destination when the user can drill down.

If an activity type has no safe detail route, render it as informational text rather than a fake clickable link.

If there is not enough reliable live activity data, show an honest empty state such as `No recent activity yet.` rather than seeded/demo records.

Any `View all activity` link must either lead to a real implemented activity/history route or be removed.

## Dashboard stat cards and CTAs

Audit every stat/metric card.

A card may be informational without a link. If it is clickable or has a CTA, the destination must work.

Examples:

- Active Students → Students list
- Attendance Today → Daily Attendance or Attendance History as appropriate
- Classes Today → Learning Planner
- Practice Work Pending → relevant Practice Work list
- Fees → working Fees route

Remove or neutralize cards whose destinations are postponed modules.

Do not use a clickable card with no meaningful destination.

## Other dashboard interaction audit

Also inspect and fix:

- `View all` links
- text links inside cards
- buttons inside Recent Activity
- badges that are clickable
- dropdown actions
- mobile quick-action controls
- empty-state CTAs
- breadcrumb links
- dashboard header shortcuts

Every interactive element must have a verified destination/action.

## Broken-link audit

Programmatically audit all hrefs produced by navigation and dashboard configuration.

For each enabled visible href:

- confirm matching Next.js route exists;
- confirm role access;
- confirm no redirect loop;
- confirm it is not generic Coming Soon content;
- confirm parent-group href behavior is intentional.

If a parent group is expandable only, do not make it navigate to a broken route.

## Navigation data cleanup

Refactor `lib/navigation.ts` if useful so current production navigation no longer depends on disabled `futureItem()` placeholders.

Keep stable unique keys such as `item.href`, `child.href`, and database IDs for live collections.
Do not regress the previous React key fix.

## Mobile navigation

Desktop and mobile should consume the same canonical navigation data where possible.
Apply identical role filtering and remove the same dead links.

## UX requirements

- clear group headings
- collapsible groups where appropriate
- sensible active-route highlighting
- no duplicate links
- no dead/disabled production rows
- no Coming Soon badge clutter
- compact ERP sidebar
- responsive layout
- accessible links/buttons
- honest empty states
- working loading/error states

## Role safety

Navigation hiding is not authorization.
Do not weaken server-side authorization or RLS to make links work.
Do not broaden Student/Parent access.

## No destructive module deletion

Removing a module from navigation does not mean dropping its database objects.
Prefer configuration/UI cleanup over destructive schema changes.

## Verification

Run:

- `npm.cmd run lint`
- `npx.cmd tsc --noEmit`
- `npm.cmd run build`
- `git diff --check`

Perform a complete route/link/action audit and report every retained:

- sidebar href;
- mobile-navigation href;
- Quick Action;
- Recent Activity drill-down link;
- dashboard card CTA;
- View All / secondary link.

If authenticated browser access is available, smoke test:

- Administrator sidebar desktop
- Administrator mobile navigation
- every retained Quick Action
- Recent Activity rendering and drill-down links
- every clickable dashboard stat/card
- all retained Fees links
- Student sidebar/dashboard links
- active-route highlighting
- group expand/collapse
- browser console for React/hydration/runtime errors

If browser automation is unavailable, clearly identify which interaction tests remain manual.

## Required final report

Report:

1. Route inventory found.
2. Navigation items removed.
3. Navigation items retained.
4. Final Administrator grouping.
5. Final Student navigation.
6. Parent navigation status.
7. Fees routes/Masters retained and any Fee gaps.
8. Quick Actions before/after and exact working destinations.
9. Recent Activity source/data behavior and drill-down destinations.
10. Dashboard cards/actions removed.
11. Dashboard cards/actions retained/added.
12. Broken links found and exact fixes.
13. Dead/inert buttons found and exact fixes.
14. Files changed.
15. Verification command results.
16. Browser tests completed/deferred.
17. Confirmation Attendance/Learning Planner/Practice Work/Fees business logic was not changed except navigation/dashboard read-only wiring where required.
18. `git status -sb`.

Do not start Examinations.
Do not add new unimplemented modules.
Do not commit or push.
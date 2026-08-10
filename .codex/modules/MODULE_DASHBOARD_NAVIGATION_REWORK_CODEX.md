# Learning Is Fun ERP
## Codex Implementation Prompt
### Dashboard + Sidebar Navigation Rework

Rework the existing Administrator/Student/Parent dashboard navigation and dashboard links so the ERP exposes only implemented, working modules.

Do not start Examinations. Do not add placeholder modules. Do not commit or push unless explicitly instructed.

## Primary goals

1. Audit every sidebar item and dashboard quick-action/card link.
2. Remove modules that are not currently implemented or intentionally postponed.
3. Group the Administrator sidebar into clear functional sections.
4. Ensure Student/Parent navigation is role-specific and only exposes routes that actually exist and are authorized.
5. Remove dead links, Coming Soon links, duplicate destinations, and misleading placeholders.
6. Preserve all existing working Attendance, Learning Planner, Practice Work, Student, Masters, Fees, and Authentication behavior.

## Repository inspection first

Before editing, inspect:

- `lib/navigation.ts`
- sidebar/mobile-navigation components
- dashboard page/components
- role-routing/auth helpers
- all current `app/(protected)/**/page.tsx` routes
- Student portal/dashboard routes
- Parent portal/dashboard routes if present
- quick-action components/cards
- any `coming-soon` route usage
- Fees routes/services/tables and any Fee Heads/Payment Modes dependencies

Build an actual route inventory before deciding which links remain.

Do not assume a route works merely because it appears in navigation.

## Navigation policy

### Hard rule

Only show a navigation item when:

- its destination route exists;
- the route is implemented, not placeholder-only;
- the current role is authorized to use it;
- the feature is intentionally part of the current ERP scope.

Do not show `Coming Soon` navigation for postponed modules.

Future modules can be reintroduced when implemented.

## Modules intentionally retained in current scope

The Fees module is intentionally part of the ERP and must remain available where implemented.

Retain supporting Masters required by Fees, including:

- Fee Heads
- Payment Modes

if they are used by the current Fees workflow.

If Fees is only partially implemented, keep the working Fee routes and supporting Masters, remove only broken/placeholder Fee links, and report any missing Fee route separately. Do not remove Fees merely because other Finance features are postponed.

## Remove from current Administrator sidebar unless repository inspection proves they are actively implemented and intentionally retained

- Parents standalone module
- Homework
- Examinations
- Marks
- Report Cards
- Communication
- Announcements
- generic Reports module
- Settings

Do not remove Fees.

A generic `Finance` parent group may be retained if it is the cleanest working parent for Fees. If `/finance` itself is only a placeholder or broken route, either make the group non-navigating/expandable or use `Fees` as the direct top-level item. Do not leave a clickable broken `/finance` link.

Do not delete database schema or source code merely because a module is removed from navigation. This task is primarily navigation/dashboard cleanup.

## Administrator sidebar grouping

Use grouped/collapsible sections following the existing sidebar architecture.

Recommended current structure:

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

Prefer a single parent group such as `Masters` or `Academic Setup`, whichever best matches the current design language. Avoid both if that creates duplication.

### Student Management
- Students / Student Master
- Academic Assignments

### Attendance
- Daily Attendance
- Attendance History
- Attendance Reports

Attendance should be a coherent group rather than being hidden among unrelated academic placeholders.

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
Retain the working Fee entry/entries discovered in the repository. Use either:

- `Fees` as a top-level group/item; or
- `Finance` as a non-broken expandable parent containing `Fees`.

Do not include unrelated Finance placeholders.

### Account
- Logout

Do not add Examinations or any postponed module.

## Student sidebar

Inspect the Student dashboard enhancement work/current portal first.

Student navigation should contain only working student destinations, expected to include where implemented:

- Dashboard
- My Practice Work
- My Schedule / Learning Planner view if a real Student route exists
- My Attendance if a real Student route exists
- Fees / My Fees only if a real Student-facing Fees route exists and is authorized
- Notifications if a real Student route exists
- Logout

Do not expose Administrator routes to Students.

Do not create fake links solely to fill the sidebar.

## Parent sidebar

If Parent portal/dashboard is not implemented yet, do not create placeholder Parent feature links.

If a Parent dashboard route already exists and is valid, expose only working Parent destinations.

Fees may later appear for Parents only if a real linked-child Fee route exists and current authorization supports it.

Parent dashboard enhancement will be handled separately.

## Dashboard rework

Audit every card, metric, quick action, recent activity link, button, and CTA on the Administrator dashboard.

Remove or replace links to postponed/unimplemented modules.

The Administrator dashboard should focus on current operational data from implemented modules:

- Students
- Attendance
- Learning Planner
- Practice Work
- Fees

Where live services exist, prefer real data over static placeholder counts.

Recommended operational cards/areas:

- Active Students
- Attendance Today / Attendance status
- Classes Today / Next Class
- Upcoming Planner Events
- Practice Work active/pending summary
- Fee summary / outstanding fees / recent collections if live Fee data/services already exist
- Recent Schedule Changes
- Recent Practice activity if available

Do not show Exam, Homework, Marks, Report Card, generic Finance, or Communication cards while those modules are not implemented.

Do not invent Fee metrics if the current Fees implementation does not expose reliable live values. In that case retain a working Fees quick action only.

## Broken-link audit

Programmatically and manually audit all hrefs produced by navigation/dashboard configuration.

For each enabled visible href:

- confirm a matching Next.js route exists;
- confirm expected role access;
- confirm no redirect loop;
- confirm it does not land on generic Coming Soon content;
- confirm parent group href behavior is intentional.

If a parent nav group is expandable only, do not make its label navigate to a non-existent route unless the component architecture requires a valid route.

## Navigation data cleanup

Refactor `lib/navigation.ts` if useful so it does not depend on `futureItem()` for current production navigation.

It is acceptable to retain helper/type definitions only if still used elsewhere, but visible navigation should not contain disabled placeholders.

Keep stable unique keys such as `item.href` / `child.href`.

Do not regress the previous React list-key fix.

## Mobile sidebar

Apply the same grouping and filtering to mobile navigation.

Desktop and mobile must consume the same canonical navigation configuration where possible so links cannot drift apart.

## UX requirements

- clear group headings
- collapsible groups where appropriate
- sensible active-route highlighting
- no duplicate links
- no disabled/dead rows
- no `Coming Soon` badge clutter
- compact sidebar appropriate for an ERP
- responsive behavior maintained
- accessible buttons/links

## Role safety

Navigation hiding is not authorization.

Do not weaken existing server-side/RLS authorization.

This task must not broaden Student or Parent access merely to make a link work.

## No destructive module deletion

Removing a feature from navigation does NOT mean dropping its database tables/migrations or deleting historical code unless the file is clearly an obsolete placeholder and safe to remove.

Prefer hiding/removing configuration entries rather than destructive database changes.

## Verification

Run:

- `npm.cmd run lint`
- `npx.cmd tsc --noEmit`
- `npm.cmd run build`
- `git diff --check`

Also perform a route/link audit and report every retained navigation href with its matching implemented route.

If authenticated browser access is available, smoke test:

- Administrator sidebar desktop
- Administrator mobile navigation
- Dashboard quick actions/cards
- Fees navigation and retained Fee routes
- Student sidebar/dashboard
- active-route highlighting
- expand/collapse behavior
- direct navigation to every retained link
- browser console for React/hydration errors

If browser automation is unavailable, explicitly say which interaction tests remain manual.

## Required final report

Report:

1. Current route inventory found.
2. Navigation items removed.
3. Navigation items retained.
4. Final Administrator grouping.
5. Final Student navigation.
6. Parent navigation status.
7. Fees routes/Masters retained and any Fee gaps found.
8. Dashboard cards/actions removed.
9. Dashboard cards/actions retained/added.
10. Broken links found and exact fixes.
11. Files changed.
12. Verification command results.
13. Browser tests completed/deferred.
14. Confirmation Attendance/Learning Planner/Practice Work/Fees business logic was not changed except for navigation-safe wiring if required.
15. `git status -sb`.

Do not start Examinations.
Do not add new unimplemented modules.
Do not commit or push.
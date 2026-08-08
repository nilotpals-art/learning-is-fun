Implement Module 02A – UI Design System & Theme.

Read:

* `AGENTS.md`
* all `.codex/` files
* `.codex/modules/02a-ui-design-system.md`

Objective:

Transform Learning Is Fun ERP from a predominantly white CRUD interface into a colorful, modern, premium school ERP while preserving all existing business logic.

Priorities:

1. Deep, bold, module-colored page headers.
2. Bold page and section typography.
3. Soft neutral/tinted page background.
4. Colorful summary cards.
5. Modern cards with accents, shadows and rounded corners.
6. Strong colored table headers.
7. Form section cards with different accents.
8. Branded deep sidebar.
9. Consistent badges, buttons and filter bars.
10. Responsive mobile styling.
11. Subtle animations only.
12. Accessibility and contrast.

Apply the design consistently to:

* Dashboard
* Academic Years
* School Boards
* Classes
* Subjects
* Batches
* Fee Heads
* Payment Modes
* Students

Do not alter:

* database schema
* Server Action behavior
* authentication
* Student provisioning
* admission-number generation
* Parent reuse
* Batch delete logic
* Finance business rules

Reuse or upgrade existing shared components instead of duplicating them.

Create shared presentation primitives only where they clearly reduce repetition.

Run:

* `npm.cmd run lint`
* `npx.cmd tsc --noEmit`
* `npm.cmd run build`
* `git diff --check`

Do not commit or push.

After implementation report:

1. Design tokens introduced
2. Shared components created
3. Shared components modified
4. Existing pages refreshed
5. Module accent mapping
6. Accessibility decisions
7. Responsive behavior
8. Verification results
9. Remaining visual QA items
10. Exact files changed

# Expandable Sidebar Navigation

Replace the current flat/grouped sidebar presentation with a polished expandable/collapsible navigation system.

The sidebar should remain deeply branded and visually strong.

---

## Sidebar Visual Design

Use:

* Deep Indigo / Purple gradient background
* White or very light text
* White/light icons
* Bold group labels
* Clear active state
* Smooth hover treatment
* Rounded navigation items
* Subtle separators where needed
* Consistent spacing

Do not make every sidebar item a different color.

The sidebar itself should remain visually cohesive.

---

# Expandable Navigation Groups

Navigation sections that contain children should be expandable and collapsible.

Recommended structure:

## Dashboard

Direct navigation item.

## Masters

Expandable.

Children:

* Academic Years
* School Boards
* Classes
* Subjects
* Batches
* Fee Heads
* Payment Modes

## Students

Direct navigation item for now:

* Students

Future Student submodules may be nested later when implemented.

## Academics

Expandable.

Children may include:

* Attendance
* Practice Work
* Examinations
* Marks
* Report Cards

Only implemented modules should behave as active navigation targets.

Coming Soon modules may remain visible but disabled if that matches existing navigation behavior.

## Finance

Expandable.

Future children may include:

* Fee Collection
* Receipts
* Security Deposit
* Refunds

Preserve existing Coming Soon behavior.

## Communication

Expandable when multiple children exist.

Potential child:

* Announcements

## Reports

Expandable when report modules are available.

## Settings

Direct or expandable depending on current/future routes.

---

# Expand / Collapse Behavior

Each navigation group with children should have:

* Group icon
* Group title
* Chevron indicator
* Expanded/collapsed state
* Smooth but subtle transition

Chevron behavior:

Collapsed:

`ChevronRight`

Expanded:

`ChevronDown`

Use Lucide icons already available in the project.

---

# Active Route Behavior

If the current route belongs to a nested child:

Example:

`/masters/classes`

Then:

* Masters must automatically be expanded.
* Classes must show the active state.

Do not require the user to expand the group manually to discover their current page.

The active item should have:

* strong contrast;
* bold text;
* visible background/tint;
* accent indicator if useful.

---

# User-Controlled Expansion

Administrators should be able to expand/collapse groups manually.

The expanded state should remain stable while navigating within the current application session.

If simple and safe, persist collapsed/expanded preferences using local UI state/storage.

Do not introduce database persistence for sidebar preferences.

---

# Default Expansion

Recommended behavior:

* Current route's parent group → always expanded.
* Other groups → collapsed by default.

Dashboard remains directly visible.

---

# Collapsed Desktop Sidebar

If the existing shell supports collapsing the entire sidebar, preserve or improve it.

When the sidebar is globally collapsed:

* show icons only;
* use accessible tooltips for labels;
* nested groups should not become unusable;
* optionally show nested navigation through a flyout/popover.

Do not introduce a complicated collapsed mode if the project does not currently support one.

Expandable groups are the priority.

---

# Mobile Navigation

Mobile navigation must use the same grouped hierarchy.

Inside the Sheet/mobile drawer:

* expandable group headers;
* nested children;
* active child highlighting;
* large touch targets;
* chevrons;
* appropriate indentation.

Close the mobile navigation after a successful navigation action.

Do not duplicate navigation configuration between desktop and mobile.

Both must consume the same `lib/navigation.ts` data.

---

# Navigation Data Model

Preserve and reuse the existing typed navigation structure where possible.

Current supported fields already include concepts such as:

* `title`
* `href`
* `icon`
* `roles`
* `enabled`
* `badge`
* `children`

Use `children` as the basis for expandable groups.

Do not create separate hard-coded arrays for sidebar sections.

---

# Role Filtering

Role filtering must continue to happen according to the existing server-owned navigation rules.

A collapsed/expanded UI must not expose unauthorized routes.

Children hidden by role filtering should not appear.

If a group has no visible children after role filtering, do not render an empty expandable group unless it has its own valid direct route.

---

# Disabled / Coming Soon Children

Preserve existing behavior.

Disabled children should:

* remain visibly disabled where intended;
* display Coming Soon badge where configured;
* not navigate to nonexistent production screens unless the existing Coming Soon route is intentionally used.

Their disabled styling should remain readable against the dark sidebar.

---

# Accessibility

Expandable groups must use accessible controls.

Requirements:

* real button element for group toggle;
* `aria-expanded`;
* keyboard activation;
* visible focus state;
* semantic nested navigation;
* sufficient contrast;
* no hover-only functionality.

---

# Animation

Use a subtle expand/collapse transition.

Avoid heavy animation.

Recommended:

* short height/opacity transition;
* rotating or swapping chevron.

Respect reduced-motion preferences where practical.

---

# Sidebar Header / Branding

At the top of the sidebar, strengthen Learning Is Fun branding.

Suggested:

**Learning Is Fun**

Subtitle:

**English Remedial Classes**

Use:

* bold institution name;
* smaller secondary tagline;
* compact branded icon/monogram if already available.

Do not consume excessive vertical space.

---

# Sidebar Footer

Keep account/logout controls clean.

Possible footer:

* User avatar
* Name
* Role
* Logout

Do not duplicate account information unnecessarily if the existing application header already handles it.

---

# Implementation Targets

Inspect and update as necessary:

* `components/layout/app-sidebar.tsx`
* `components/layout/mobile-navigation.tsx`
* `components/layout/app-shell.tsx`
* `lib/navigation.ts`

Create a small reusable nested-navigation component only if it simplifies both desktop and mobile behavior.

Possible examples:

* `navigation-group.tsx`
* `navigation-item.tsx`

Do not create a large navigation framework.

---

# Acceptance Criteria

Sidebar redesign is complete when:

* Sidebar has a deep branded color treatment.
* Navigation groups are expandable/collapsible.
* Masters expands to reveal all Masters children.
* Current route parent automatically expands.
* Current child is clearly highlighted.
* Desktop and mobile use the same navigation data.
* Role filtering still works.
* Coming Soon behavior still works.
* Keyboard navigation works.
* `aria-expanded` is present.
* No unauthorized routes appear.
* Existing routes remain unchanged.

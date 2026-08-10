# Learning Is Fun ERP
## Codex Implementation Prompt
### Student Dashboard Enhancement

Implement the **Student Dashboard Enhancement** in the existing `learning-is-fun` repository.

Do not redesign unrelated modules. Do not start Examinations. Preserve all existing Authentication, Attendance, Learning Planner, Practice Work, RLS, RPC, and navigation behavior unless a narrowly scoped compatibility fix is genuinely required.

Do not commit or push unless explicitly instructed.

---

# 1. Repository inspection first

Before modifying code, inspect the current repository and identify the actual Student portal/dashboard route and the existing Student navigation structure.

Do not assume the route path from this specification if the repository uses a different one.

Inspect and reuse:

- Authentication profile and role routing
- Student-to-profile relationship
- Student current academic assignment / batch membership
- Attendance read services / reporting RPCs
- Learning Planner Student-readable events
- Practice Work Student assignment / attempt services
- Notification read services
- Existing layout, card, badge, typography, responsive, loading, and empty-state components
- Existing Student navigation items
- Existing server-component / server-action conventions

Report the actual Student dashboard route and the existing services/components you will reuse before implementation.

Do not duplicate business logic that already exists.

---

# 2. Goal

Create a polished, colorful, English-learning-themed Student Dashboard that gives the signed-in Student a useful daily overview of:

- Personal welcome and learning context
- English quote of the login/session
- Today's class / next class
- Practice Work status and latest performance
- Attendance summary
- Learning progress
- Upcoming Learning Planner events
- Notifications
- Quick actions

The dashboard must be Student-specific and read-only.

It must consume existing module data through secure server-side reads and existing RLS rather than creating duplicate dashboard tables.

---

# 3. No new dashboard storage by default

Do NOT create a `student_dashboard` table.

Do NOT duplicate Attendance, Learning Planner, Practice Work, Student, Batch, or Notification data.

The dashboard is an aggregation/read experience over existing domain data.

Only create a new database object if a measured query/performance/security requirement makes it genuinely necessary. If that happens, document why before implementation.

---

# 4. Student identity and authorization

The dashboard must derive the Student from the authenticated profile using the repository's actual canonical relationship.

Expected relationship based on existing architecture:

```text
auth.uid()
→ profiles
→ students.profile_id
→ student
```

Do not trust a Student ID from query params, hidden form fields, local storage, or client state.

A Student must only see their own:

- attendance
- batch / academic context
- schedule events
- Practice Work assignments and attempts
- notifications
- learning metrics

No Student mutation capability should be added to dashboard cards.

---

# 5. Dashboard layout

Design the Student Dashboard as a responsive, colorful English-learning homepage.

Recommended visual hierarchy:

```text
Welcome / Student Identity
        ↓
English Quote
        ↓
Today's Learning + Next Class
        ↓
Practice Work + Attendance
        ↓
My Progress
        ↓
Upcoming Events
        ↓
Notifications
        ↓
Quick Actions
```

Desktop may use a two-column grid where appropriate.

Tablet should collapse cleanly.

Mobile must become a single-column card/agenda layout.

Do not force wide tables on the Student dashboard.

Use the project's existing design system and spacing conventions.

The dashboard should feel lively and suitable for English Remedial Classes, but remain readable and professional.

---

# 6. Welcome section

Show:

- Student first/display name
- Current academic year if available
- Current Batch if available
- Optional Board/Class context when safely derived from the current effective assignment

Example:

```text
Good afternoon, Rahul 👋
Ready for today's English practice?

CBSE • Class 7 • Grammar Foundation
Academic Year 2026–27
```

Do not fail the entire page if one contextual field is unavailable.

Use graceful fallbacks.

---

# 7. English Quote of the Login

Implement an **independent external quote feature**.

Requirements:

- Do not store fetched quotes in Supabase.
- Do not create a quote table.
- Fetch a short English/literature/learning quote from a suitable public HTTP API or small server-side source.
- Prefer English authors, writers, poets, educators, or clearly attributable English-language literary figures.
- Show quote text + author.
- Avoid displaying unattributed, offensive, political, religiously inflammatory, or inappropriate content.
- Keep quote length suitable for a dashboard card.
- If the external service fails, times out, rate-limits, or returns unsuitable data, use a small hard-coded fallback set bundled in the application.
- External failure must never break the dashboard.

Important behavior:

The user requirement is for the quote to change on login/session use without requiring persistent database storage.

Implement a practical server-side approach such as:

- fetch on dashboard request with reasonable caching/revalidation rules, or
- session-scoped/random selection behavior compatible with the current architecture.

Do not add local database persistence merely to guarantee quote rotation.

Keep external calls server-side.

Add timeout/error handling.

Do not leak secrets; ideally use a public no-key endpoint or static fallback if reliability is poor.

---

# 8. Today's Learning card

Use Learning Planner data.

Show:

- Today's scheduled events relevant to the Student's active batch membership
- Highlight the next upcoming class/event
- Event title
- Event type
- Date
- Start/end time
- Subject if available
- Batch if useful
- Status

Relevant types may include:

```text
regular_class
practice_work
practice_test
mock_test
parent_meeting
special_class
```

Do not introduce Examination behavior.

If an event was rescheduled or cancelled, make that visible.

Suggested labels:

```text
Next Class
Today
Rescheduled
Cancelled
```

The dashboard must not expose unrelated Batch events.

---

# 9. Practice Work summary

Reuse Module 07 services/read models.

Show useful Student-level counts such as:

- Pending / not started
- In progress
- Completed
- Due soon / overdue if the domain model supports due dates

Also show the most actionable item:

- Continue Practice Work
- Start Practice Work
- Review Completed Practice

Where appropriate show:

- Practice Set title
- Topic / skill
- due date
- attempt status
- latest percentage
- marks awarded / maximum marks

Do not expose correct answers before submission.

Do not perform scoring on the dashboard.

Link to the existing Practice Work Student route.

---

# 10. Attendance summary

Reuse the existing Attendance reporting logic.

Do not recalculate canonical attendance percentages in Client Components.

Use the existing effective-present definition:

```text
Effective Present = Present + Late
```

Display at minimum:

- Attendance percentage
- Present count
- Late count
- Effective Present count
- Absent count
- Leave count
- Total attendance records

If the existing Student Attendance service/RPC already exposes a canonical summary, use it directly.

If zero records exist, show `—` or an appropriate empty state rather than `0%` if that matches the existing Attendance UI convention.

Consider a compact progress bar/ring only if it follows existing components.

Do not change Attendance mutation code.

---

# 11. My Progress

Build a Student-friendly learning progress area from **Practice Work attempts only** for this phase.

Do not imply Exam performance because Examinations are postponed.

Show metrics such as:

- completed Practice Sets
- average submitted Practice Work percentage
- latest Practice Work percentage
- first-attempt performance where available
- improvement after retry/self-correction where available
- strongest topic/skill if enough data exists
- needs-more-practice topic/skill if enough data exists

Avoid misleading analytics on tiny samples.

If insufficient data exists, show a constructive empty state such as:

```text
Complete more Practice Work to see your learning trends here.
```

Do not add AI recommendations in this dashboard phase.

Do not make a live OpenAI call for progress analytics.

---

# 12. Upcoming section

Use Learning Planner data to show upcoming relevant events.

Recommended range: next 7–14 days.

Show a compact agenda of the next few items.

Include:

- classes
- Practice Work-related schedule events
- practice tests
- mock tests
- parent meetings if Student visibility is already permitted
- special classes

Do not include unrelated Student/Batch events.

Do not add Examination data.

---

# 13. Notifications

Reuse Module 06 notification infrastructure.

Show:

- unread count
- recent Student notifications
- title
- message preview
- priority
- created/sent time where applicable
- read/unread state

Do not create a second notification system.

If an existing notification-read RPC/action exists, reuse it.

Dashboard rendering itself should remain primarily read-only; if marking read from the dashboard is already supported safely, reuse that behavior rather than inventing another path.

---

# 14. Quick Actions

Provide large, mobile-friendly quick actions to the existing Student routes.

At minimum, where routes exist:

```text
My Practice Work
My Schedule
My Attendance
Notifications
```

Use the actual route names after repository inspection.

Do not create dead links.

Do not add Examinations.

---

# 15. Data aggregation service

Prefer a dedicated server-only Student Dashboard service that composes existing reads.

Suggested location:

```text
features/student-dashboard/
```

Suggested files:

```text
features/student-dashboard/types/student-dashboard.ts
features/student-dashboard/services/student-dashboard-service.ts
features/student-dashboard/services/quote-service.ts
features/student-dashboard/components/student-dashboard.tsx
features/student-dashboard/components/student-welcome.tsx
features/student-dashboard/components/english-quote-card.tsx
features/student-dashboard/components/todays-learning-card.tsx
features/student-dashboard/components/practice-summary-card.tsx
features/student-dashboard/components/attendance-summary-card.tsx
features/student-dashboard/components/student-progress-card.tsx
features/student-dashboard/components/upcoming-events-card.tsx
features/student-dashboard/components/student-notifications-card.tsx
features/student-dashboard/components/student-quick-actions.tsx
```

Adapt names to existing repository conventions.

Do not introduce a parallel architecture if an existing Student feature folder already exists.

---

# 16. Student Dashboard aggregate type

Define a typed aggregate model rather than passing arbitrary Supabase rows directly into UI components.

Example conceptual shape:

```ts
interface StudentDashboardData {
  student: StudentDashboardIdentity;
  quote: StudentQuote;
  todaysEvents: StudentDashboardEvent[];
  nextEvent: StudentDashboardEvent | null;
  practice: StudentPracticeSummary;
  attendance: AttendanceTotals | null;
  progress: StudentPracticeProgress;
  upcomingEvents: StudentDashboardEvent[];
  notifications: StudentDashboardNotification[];
  unreadNotifications: number;
}
```

Reuse canonical shared types such as `AttendanceTotals` when already available rather than redefining them.

Avoid `any`.

---

# 17. Loading strategy

The dashboard should not become slow because several modules are aggregated.

Use server-side parallel reads where safe:

```text
Student identity/current assignment
Attendance summary
Learning Planner events
Practice Work summary/progress
Notifications
Quote
```

Use `Promise.all` or equivalent only when calls are independent.

Do not cause N+1 queries.

If one optional section fails, prefer graceful section-level degradation where feasible rather than failing the entire dashboard.

Authentication/authorization failures must still fail securely.

---

# 18. Empty and error states

Every dashboard section must have an intentional empty state.

Examples:

No class today:

```text
No class scheduled for today.
```

No Practice Work:

```text
You're all caught up — no Practice Work is waiting.
```

No Attendance records:

```text
Attendance will appear after your first recorded class.
```

No progress data:

```text
Complete Practice Work to start building your progress view.
```

No notifications:

```text
You're all caught up.
```

Quote API failure:

Use fallback quote silently.

Do not expose raw Supabase/Postgres errors to Students.

---

# 19. Color and visual identity

The Student Dashboard should be more colorful than the Administrator dashboard while staying consistent with the app's component system.

Use color purposefully for:

- learning
- attendance
- Practice Work
- upcoming events
- notifications

Avoid excessive gradients, neon effects, or low-contrast text.

Keep WCAG-friendly contrast.

Use English-learning visual cues such as book, quote, pen, vocabulary, reading, or progress icons where compatible with the existing icon system.

Do not add heavy image assets unless they genuinely improve the design.

---

# 20. Responsive requirements

Desktop:

- balanced 2-column grid where useful
- quote/welcome area prominent

Tablet:

- cards collapse appropriately

Mobile:

- single-column flow
- large tap targets
- no horizontal overflow
- quick actions remain easy to use
- agenda/event items remain readable

Audit at common mobile widths in source/browser tooling if available.

---

# 21. Navigation

Inspect existing Student navigation.

Ensure Student Dashboard remains the Student's landing route after login.

Student navigation should expose only routes the Student is authorized to access.

At minimum, where already implemented:

- Dashboard
- My Practice Work
- My Schedule / relevant Learning Planner view
- My Attendance
- Notifications
- Logout

Do not expose Administrator Learning Planner management routes to Students.

Do not add Examinations.

---

# 22. Security requirements

Verify:

- Student cannot request another Student's dashboard data by changing IDs.
- Student cannot see another Student's Practice Work.
- Student cannot see another Batch's planner events.
- Student cannot see another user's notifications.
- Student cannot see correct answers before submission.
- Student cannot access Administrator dashboard management actions.
- No service-role key is used in browser code.
- Quote fetching does not introduce SSRF-style arbitrary URL input; endpoint must be fixed server-side.

Do not weaken existing RLS to make dashboard queries easier.

If an RLS/read issue is discovered, fix it narrowly through a new migration and add rollback/test coverage.

Never edit an applied migration.

---

# 23. Attendance compatibility

Attendance is complete and must remain canonical.

Do not change:

- attendance status model
- effective-present calculation
- attendance mutation RPCs/actions
- correction logic
- reporting percentage formula

The dashboard is a consumer only.

---

# 24. Learning Planner compatibility

Do not change scheduling, materialization, reschedule, cancel, conflict, holiday, or notification lifecycle behavior.

The dashboard should only consume Student-visible events.

Do not create duplicate calendar events.

---

# 25. Practice Work compatibility

Do not change:

- Question Bank
- AI generation
- correct-answer security
- Practice Set snapshots
- scoring
- retry behavior
- attempt history

The dashboard should only summarize and link to these existing workflows.

Live OpenAI generation may still be blocked by API credits. That must not block Student Dashboard implementation because the dashboard does not require a live AI request.

---

# 26. Quote-service testing

Add deterministic tests or validation where practical for:

- valid quote response
- missing author
- oversized quote
- network failure
- timeout
- malformed JSON
- unsuitable response
- fallback behavior

Do not make build/test success depend on the external quote service being online.

Mock only in tests; production should retain the real external/fallback behavior.

---

# 27. Dashboard verification

Verify at minimum:

## Authorization

- Student role can access Student Dashboard.
- Administrator cannot accidentally render Student-specific dashboard as another user.
- Parent is not treated as Student.
- Anonymous user redirects to login.

## Student identity

- Correct Student record resolves from authenticated profile.
- Missing Student linkage fails gracefully/securely.

## Attendance

- Canonical percentage displayed.
- Present/Late/Effective Present counts correct.
- Zero-record state correct.

## Practice Work

- Pending/completed counts match permitted Student assignments.
- Latest score is correct.
- Links point to existing Student Practice Work routes.
- No pre-submission answer key is present in page payload/UI.

## Learning Planner

- Only own active-batch events appear.
- Rescheduled/cancelled status represented correctly.
- Next event selection is chronological.

## Notifications

- Only own notifications appear.
- Unread count is correct.

## Progress

- Uses submitted Practice Work attempts only.
- Retry/original data is not double-counted misleadingly.
- Empty state works.

## Quote

- External quote appears when valid.
- Fallback appears when unavailable.
- No Supabase quote storage created.

## UI

- No React key warnings.
- No hydration warnings.
- No horizontal overflow on mobile.
- Loading/empty/error states work.

---

# 28. Verification commands

Run:

```text
npm.cmd run lint
npx.cmd tsc --noEmit
npm.cmd run build
git diff --check
```

Run any relevant existing SQL/RPC/RLS tests if database changes become necessary.

Do not add a new test framework just for this dashboard.

If browser automation is unavailable, distinguish source/build verification from true authenticated browser testing.

---

# 29. Explicitly out of scope

Do NOT implement:

```text
Examinations
Marks
Report Cards
Exam analytics
AI learning recommendations
Parent Dashboard redesign
Teacher dashboard
Chatbot
New Attendance calculations
New Practice Work scoring rules
New Learning Planner lifecycle behavior
Quote persistence in Supabase
```

---

# 30. Definition of Done

Student Dashboard Enhancement is complete when:

- existing Student dashboard route is enhanced or canonical route is established safely
- Student identity is resolved securely
- welcome context works
- external English quote + fallback works without Supabase storage
- today's/next Learning Planner event works
- Practice Work summary works
- Attendance summary uses canonical reporting logic
- Practice Work progress summary works
- upcoming events work
- notifications work
- quick actions work
- responsive layout works
- Student-only data isolation is preserved
- no pre-submission answer leakage occurs
- no Attendance regression
- no Learning Planner regression
- no Practice Work regression
- lint passes
- TypeScript passes
- production build passes
- `git diff --check` passes

---

# 31. Required Codex final report

When finished, report:

1. Repository findings and actual Student dashboard route
2. Existing services reused
3. Files created
4. Files modified
5. Database changes, if any
6. Student identity resolution path
7. Attendance aggregation source
8. Learning Planner aggregation source
9. Practice Work aggregation source
10. Notification aggregation source
11. Quote API/source and fallback behavior
12. Quote caching/session behavior
13. Student progress calculation rules
14. Security/RLS verification
15. Responsive/UI work
16. React key/hydration audit
17. Verification command results
18. Browser-test status
19. Any defects found and fixes made
20. Confirmation that Examinations were not started
21. Confirmation that Attendance/Learning Planner/Practice Work mutation behavior was not changed
22. Git status

Do not commit or push.

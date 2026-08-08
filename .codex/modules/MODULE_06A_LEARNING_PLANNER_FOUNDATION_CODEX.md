# Learning Is Fun ERP
## Codex Implementation Prompt
### Module 06A — Learning Planner Foundation

Implement **Module 06A — Learning Planner Foundation** in the existing `learning-is-fun` repository.

Do not redesign unrelated modules. Do not commit or push unless explicitly instructed.

## Existing architecture to reuse

- Next.js App Router
- TypeScript
- Supabase PostgreSQL + Supabase SSR
- Server Actions
- Zod
- Tailwind CSS + existing Base UI components
- TanStack Table
- Existing institute-scoped architecture
- Existing active-profile / role authorization
- Existing Attendance module

## Critical repository findings to honor

Before implementation, inspect and confirm these current-state assumptions:

- `student_assignments` is the authoritative active/historical Batch membership model.
- Do not use legacy `student_batches` for recipient or visibility logic.
- Membership on an event date is valid when:

```text
effective_from <= event_date
AND (effective_to IS NULL OR effective_to >= event_date)
```

- Parent relationships use `student_parent_links -> parents`.
- Do not use `student_parents` for notification recipient resolution.
- Student auth identity resolves through `students.profile_id -> profiles.id -> auth.users.id`.
- Parent auth identity resolves through `parents.profile_id -> profiles.id -> auth.users.id`.
- Branches are structurally supported; `branch_id = NULL` is institute-wide where compatible with current conventions.
- No JS test runner is currently configured; verification should use transactional SQL tests, lint, TypeScript, build, diff review, and Supabase advisors.
- Preserve the completed Attendance mutation behavior.

If inspection contradicts any of these assumptions, stop and report the specific conflict before implementing that part.

---

# 1. Objective

Build the shared scheduling foundation for:

- Regular Classes
- Practice Work
- Practice Tests
- Mock Tests
- Exams
- Parent Meetings
- Holidays
- Special Classes
- Rescheduling
- Cancellation
- Notifications
- Schedule History

Future Practice Work and Examination modules must reuse this scheduling engine instead of implementing separate calendars.

---

# 2. Canonical enums

## Schedule types

```text
regular_class
practice_work
practice_test
mock_test
exam
parent_meeting
holiday
special_class
```

Do not create `rescheduled_class`; rescheduling is a lifecycle action/status.

## Schedule statuses

```text
scheduled
rescheduled
cancelled
completed
```

## Schedule change types

```text
created
rescheduled
cancelled
restored
completed
```

## Notification priorities

```text
normal
important
urgent
```

## Initial delivery channels

```text
in_app
email
```

Actual email sending is deferred. Design so `sms`, `whatsapp`, and `push` can be added later.

---

# 3. Migration strategy

Create a new migration and matching rollback using repository naming conventions, logically equivalent to:

```text
supabase/migrations/<timestamp>_learning_planner_foundation.sql
supabase/rollbacks/<timestamp>_learning_planner_foundation_rollback.sql
```

Never edit previously applied migrations.

The migration must include:

- tables
- constraints
- foreign keys
- tenant-safe references
- indexes
- updated-at behavior where appropriate
- RLS
- policies
- grants
- lifecycle RPCs/functions
- SQL comments

Inspect whether `branches`, `batches`, and `subjects` need composite uniqueness on `(id, institute_id)` to support tenant-safe composite foreign keys. Add targeted composite UNIQUE constraints only if required for referential integrity. Rollback must remove them after dependent Learning Planner objects are dropped.

---

# 4. Table: `class_schedules`

Purpose: recurring weekly batch schedule definitions.

Required logical fields:

```text
id uuid primary key
institute_id uuid not null
branch_id uuid null
academic_year_id uuid not null
batch_id uuid not null
subject_id uuid null

day_of_week smallint not null
start_time time not null
end_time time not null

schedule_type text not null
room text null

effective_from date not null
effective_to date null

is_active boolean not null default true
created_by uuid not null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Constraints:

```text
day_of_week between 1 and 7
end_time > start_time
effective_to is null or effective_to >= effective_from
```

Restrict `schedule_type` to canonical values. Use actual repository foreign-key targets and tenant-safe composite FKs where appropriate.

---

# 5. Table: `schedule_events`

Purpose: actual dated calendar events.

Required logical fields:

```text
id uuid primary key
institute_id uuid not null
branch_id uuid null
academic_year_id uuid not null
batch_id uuid null
class_schedule_id uuid null
subject_id uuid null

event_date date not null
start_time time null
end_time time null

schedule_type text not null
status text not null default 'scheduled'

title text not null
description text null
room text null

exam_id uuid null
original_event_id uuid null
reschedule_reason text null
cancellation_reason text null

notification_required boolean not null default true
created_by uuid not null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Rules:

- `original_event_id` self-references `schedule_events.id`.
- `exam_id` remains nullable UUID without FK in Module 06A because Examination does not yet exist.
- Restrict schedule type and status to canonical values.
- Holiday may be all-day with both times NULL, or timed with both values.
- Every other event type requires both times.
- Partial time pairs are invalid.
- Whenever times are present, `end_time > start_time`.

---

# 6. Table: `schedule_changes`

Purpose: immutable lifecycle/audit history.

```text
id uuid primary key
schedule_event_id uuid not null
change_type text not null
old_date date null
old_start_time time null
old_end_time time null
new_date date null
new_start_time time null
new_end_time time null
reason text null
changed_by uuid not null
changed_at timestamptz not null default now()
```

Restrict `change_type` to canonical values.

Normal application flows must never UPDATE or DELETE existing schedule change rows. Use INSERT + SELECT only.

---

# 7. Table: `notifications`

```text
id uuid primary key
institute_id uuid not null
schedule_event_id uuid null
notification_type text not null
title text not null
message text not null
priority text not null default 'normal'
created_by uuid not null
created_at timestamptz not null default now()
```

Restrict priority.

---

# 8. Table: `notification_recipients`

```text
id uuid primary key
notification_id uuid not null
user_id uuid not null
recipient_role text not null
delivery_channel text not null default 'in_app'
delivery_status text not null default 'pending'
read_at timestamptz null
sent_at timestamptz null
created_at timestamptz not null default now()
```

Add uniqueness equivalent to:

```text
(notification_id, user_id, delivery_channel)
```

---

# 9. Optional future table: `class_session_notes`

Do not build a full Class Notes feature or UI in Module 06A.

If it fits cleanly without expanding scope, create:

```text
id uuid primary key
institute_id uuid not null
schedule_event_id uuid not null unique
topics_covered text null
learning_objectives text null
remarks text null
follow_up_required boolean not null default false
created_by uuid not null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Do not add `practice_work_id` yet. If this table would materially expand scope, defer it and document the decision.

---

# 10. Branch semantics

Use repository-compatible branch handling:

- `branch_id = NULL` means institute-wide where supported.
- Admin with `profiles.branch_id IS NULL` may manage institute-wide records.
- Branch-scoped admin may manage matching branch records and institute-wide records where current authorization rules permit.
- Any supplied branch must belong to authenticated institute.
- Student and Parent visibility remains batch-membership-driven.

---

# 11. Indexes

At minimum create practical indexes for:

```text
class_schedules(institute_id)
class_schedules(academic_year_id)
class_schedules(batch_id)
class_schedules(is_active)

schedule_events(institute_id)
schedule_events(branch_id)
schedule_events(academic_year_id)
schedule_events(batch_id)
schedule_events(event_date)
schedule_events(status)
schedule_events(schedule_type)

schedule_changes(schedule_event_id)

notifications(institute_id)
notifications(schedule_event_id)

notification_recipients(user_id)
notification_recipients(notification_id)
notification_recipients(read_at)
```

Add composite indexes when justified by actual access patterns. Avoid redundant indexes covered by unique constraints.

---

# 12. RLS

Enable RLS on all new tables.

Follow existing repository policy conventions based on:

- `profiles.id = auth.uid()`
- active profile
- role
- institute
- branch scope where applicable
- record ownership/membership

## Administrators

Authorized administrators may read and mutate Learning Planner data within tenant/branch scope.

At application level, reuse the existing authorization helper such as `requireRole(DASHBOARD_ROLES)` where appropriate.

## Students

Students may SELECT schedule events only when they belong to `event.batch_id` through date-valid `student_assignments`:

```text
effective_from <= schedule_events.event_date
AND (effective_to IS NULL OR effective_to >= schedule_events.event_date)
```

Students have no INSERT/UPDATE/DELETE rights.

## Parents

Parents may SELECT events only when:

```text
auth user
-> parents.profile_id
-> student_parent_links
-> linked student
-> date-valid student_assignments
-> batch
-> schedule_event
```

Parents have no INSERT/UPDATE/DELETE rights.

## Notifications

Users may read recipient rows belonging to themselves and associated notification content only when they are recipients.

Administrators may create notification content and recipients only in tenant scope.

## `schedule_changes`

No normal UPDATE or DELETE policy. Treat as immutable audit history.

---

# 13. Atomic lifecycle RPCs

Use guarded, transactional PostgreSQL functions for multi-row lifecycle operations.

Implement at least:

```text
create_schedule_event
reschedule_schedule_event
cancel_schedule_event
complete_schedule_event
mark_schedule_notification_read
```

Use `SECURITY INVOKER` where feasible and add explicit grants.

## `create_schedule_event`

Atomically:

1. Validate tenant/role.
2. Recheck conflicts.
3. Insert event.
4. Insert `schedule_changes` with `created`.
5. Create notification and recipients when required.
6. Return created event.

## `reschedule_schedule_event`

Atomically:

1. Load original event.
2. Reject cancelled event.
3. Reject completed event.
4. Validate institute/branch authorization.
5. Validate new date/time.
6. Recheck conflicts.
7. Mark original event `rescheduled`.
8. Create NEW event.
9. Set new `original_event_id = old.id`.
10. Preserve reason.
11. Insert immutable change row.
12. Create notification.
13. Create deduplicated recipients.
14. Return new event.

Never overwrite the original date/time as the only historical record.

## `cancel_schedule_event`

Atomically:

1. Reject completed event.
2. Set `status = cancelled`.
3. Save cancellation reason.
4. Insert change row.
5. Create notification.
6. Resolve recipients.

Do not delete the event.

## `complete_schedule_event`

Set `status = completed`, add audit row, and do not mutate Attendance.

---

# 14. Conflict detection

Create:

```text
features/learning-planner/services/conflict-service.ts
```

Implement:

```text
checkBatchConflict()
checkRoomConflict()
checkEventConflict()
```

Exact overlap rule:

```text
existing.start_time < proposed.end_time
AND existing.end_time > proposed.start_time
```

Rules:

- same institute
- same date
- cancelled events ignored
- current event being rescheduled excluded
- adjacent slots allowed
- same-batch overlap blocks
- normalized same-room overlap blocks
- untimed all-day holidays do not create normal time-overlap conflicts

Check conflicts in both:

- service layer for useful UI errors
- atomic DB functions for race-condition safety

Return typed results such as:

```ts
type EventConflictResult =
  | { hasConflict: false }
  | {
      hasConflict: true
      type: "batch" | "room"
      conflictingEventId: string
      message: string
    }
```

---

# 15. Shared TypeScript types

Create:

```text
features/learning-planner/types/learning-planner.ts
```

Define explicit types for:

- ScheduleType
- ScheduleStatus
- ScheduleChangeType
- NotificationPriority
- DeliveryChannel
- ClassSchedule
- ScheduleEvent
- ScheduleChange
- PlannerNotification
- NotificationRecipient
- CreateScheduleInput
- UpdateScheduleInput
- CreateEventInput
- RescheduleEventInput
- CancelEventInput
- CompleteEventInput
- PlannerFilters
- EventConflictResult

No `any`.

---

# 16. Zod schemas

Create:

```text
features/learning-planner/schemas/schedule-schema.ts
features/learning-planner/schemas/event-schema.ts
features/learning-planner/schemas/reschedule-schema.ts
```

Reuse repository normalization conventions, including uppercase normalization where existing modules do so.

Validate UUIDs, enums, time/date ranges, holiday time rules, meaningful reasons, maximum lengths, and normalized text.

Cancellation schema may live in the most relevant file rather than creating unnecessary files.

---

# 17. Services

## Schedule service

Create:

```text
features/learning-planner/services/schedule-service.ts
```

Implement:

```text
getSchedules()
getScheduleById()
createSchedule()
updateSchedule()
deactivateSchedule()
```

Requirements:

- server-only
- SSR Supabase client
- authenticated profile
- institute derived from profile, never browser input
- branch rules enforced
- validate related academic year, batch, subject
- typed results

## Event service

Create:

```text
features/learning-planner/services/event-service.ts
```

Implement:

```text
getEvents()
getEventById()
getTodaysEvents()
getUpcomingEvents()
createEvent()
rescheduleEvent()
cancelEvent()
completeEvent()
```

Lifecycle mutations must use atomic RPCs.

## Notification service

Create:

```text
features/learning-planner/services/notification-service.ts
```

Implement:

```text
createScheduleNotification()
resolveEventRecipients()
getUserNotifications()
markNotificationRead()
```

Recipient path must use the actual schema:

```text
schedule_event.batch_id
-> date-valid student_assignments
-> students.profile_id
-> student_parent_links
-> parents.profile_id
```

Do not use `student_batches` or `student_parents`.

Create pending `in_app` and `email` rows only. Do not send email yet.

---

# 18. Notification templates

At minimum support:

- `Class Scheduled`
- `Class Rescheduled`
- `Class Cancelled`
- `Practice Test Scheduled`
- `Mock Test Scheduled`
- `Exam Scheduled`
- `Parent Meeting Scheduled`

Reschedule message must include event title, old date/time, new date/time, and reason.

Cancellation message must include reason.

---

# 19. Server Actions

Create:

```text
features/learning-planner/actions/schedule-actions.ts
features/learning-planner/actions/event-actions.ts
```

Implement:

```text
createClassScheduleAction()
updateClassScheduleAction()
deactivateClassScheduleAction()
createScheduleEventAction()
rescheduleScheduleEventAction()
cancelScheduleEventAction()
completeScheduleEventAction()
```

Use:

- Zod
- existing `requireRole(DASHBOARD_ROLES)` pattern
- service layer
- typed discriminated action results
- controlled error mapping
- `revalidatePath`

Do not duplicate business logic inside actions.

---

# 20. Routes and UI foundation

Create protected routes:

```text
app/(protected)/learning-planner/page.tsx
app/(protected)/learning-planner/calendar/page.tsx
app/(protected)/learning-planner/schedules/page.tsx
app/(protected)/learning-planner/events/page.tsx
app/(protected)/learning-planner/notifications/page.tsx
app/(protected)/learning-planner/history/page.tsx
```

Add `loading.tsx` where consistent with current repository patterns.

Create focused components under:

```text
features/learning-planner/components/
```

Suggested components:

```text
learning-planner-overview.tsx
planner-filters.tsx
planner-agenda.tsx
schedule-list.tsx
schedule-form.tsx
event-list.tsx
event-form.tsx
event-card.tsx
event-details.tsx
reschedule-dialog.tsx
cancel-event-dialog.tsx
schedule-history.tsx
notification-list.tsx
```

Do not build drag-and-drop.

Overview should show live data where backend is ready:

```text
Classes Today
Upcoming Events
Rescheduled
Cancelled
Next Event
Recent Schedule Changes
```

Responsive behavior:

- Desktop: calendar/agenda/table as appropriate
- Tablet: compact layout
- Mobile: agenda/list preferred
- Do not force a wide weekly calendar grid on phones

---

# 21. Navigation

Modify existing navigation architecture and add expandable:

```text
Learning Planner
```

Children:

```text
Overview
Calendar
Class Schedule
Events
Notifications
Schedule History
```

Do not add Practice Work or Examination implementation yet.

---

# 22. Attendance compatibility

Attendance is already complete.

Do NOT modify Attendance mutation behavior in Module 06A.

Do NOT add Learning Planner dependencies inside Attendance yet.

Document only the future controlled integration point:

```text
attendance session -> schedule_event_id
```

---

# 23. Recurring event materialization — deferred to Module 06B

Module 06A stores recurring definitions in `class_schedules`.

Do not create huge ranges of future event rows.

Document the future RPC:

```text
generate_schedule_events(from_date, to_date)
```

Future behavior should:

- materialize recurring definitions into `schedule_events`
- prevent duplicates
- respect effective dates
- respect inactive schedules
- handle holidays
- generate only requested ranges

Do not implement in Module 06A unless strictly necessary for current UI functionality.

---

# 24. Practice Work and Examination — deferred

Do not create Practice Work tables yet:

```text
practice_sets
practice_questions
practice_assignments
practice_attempts
```

Future Practice Work may reference `schedule_event_id`.

Do not implement Examination business logic, marks, reports, or analytics.

Future Examination will reuse `schedule_events`, and a later migration may add a FK for `schedule_events.exam_id`.

---

# 25. Student and Parent portals

Module 06A must provide RLS/read-service compatibility for Students and Parents.

Do NOT redesign Student or Parent dashboards in this module.

---

# 26. Verification

Do not introduce a new JS test framework solely for this module.

Add transactional SQL verification covering:

- constraints
- invalid enums
- invalid time rules
- batch overlap
- room overlap
- adjacent events allowed
- cancelled events ignored
- cross-institute rejection
- reschedule preserves original
- replacement linkage
- audit creation
- notification creation
- recipient deduplication
- cancellation
- completion
- Student read isolation
- Parent read isolation
- Student mutation denial
- Parent mutation denial
- rollback correctness

Run at minimum:

```text
npm.cmd run lint
npx.cmd tsc --noEmit
npm.cmd run build
git diff --check
```

Also run:

- transactional SQL verification
- Supabase security advisor
- Supabase performance advisor
- full `git status`
- final diff review

Do not treat unrelated pre-existing advisor warnings as Module 06A failures unless this module introduces or worsens them.

---

# 27. Definition of Done

Module 06A is complete only when:

- migration applied
- rollback validated
- tables exist
- tenant-safe FKs work
- RLS enabled and tested
- schedules CRUD works
- event lifecycle works
- batch conflict detection works
- room conflict detection works
- original event preserved after reschedule
- immutable history works
- cancellations preserve event rows
- notifications and recipients work
- notification read flow works
- minimal Learning Planner UI works
- navigation works
- lint passes
- TypeScript passes
- production build passes
- diff check passes
- no Attendance regression
- no auth regression
- no Masters regression
- no Student module regression

---

# 28. Explicitly deferred

Do not implement:

- automatic recurring event generation
- drag-and-drop calendar
- actual email delivery
- SMS
- WhatsApp
- push notifications
- Practice Work question bank
- Practice attempts
- answer checking
- Examination marks
- report cards
- exam analytics
- Attendance `schedule_event_id` integration
- full Class Notes UI
- Student Planner dashboard redesign
- Parent Planner dashboard redesign
- AI functionality

---

# 29. Required implementation order

Use this sequence:

```text
01 Repository inspection
02 Migration + rollback
03 Tenant-safe constraints
04 Tables + indexes
05 RLS + grants
06 Atomic lifecycle RPCs
07 SQL verification
08 Shared TypeScript types
09 Zod schemas
10 Conflict service
11 Schedule service
12 Event service
13 Notification service
14 Server Actions
15 Learning Planner routes
16 Overview UI
17 Schedule management UI
18 Event management UI
19 Reschedule / Cancel UI
20 Schedule History
21 Notifications UI
22 Navigation
23 Full verification
24 Final implementation report
```

---

# 30. Required Codex final report

When finished, report:

1. Repository findings and actual relationships used.
2. Files created.
3. Files modified.
4. Exact migration filename.
5. Exact rollback filename.
6. Tables created.
7. Existing composite tenant-safe constraints added.
8. RLS policy summary.
9. RPCs/functions added.
10. Important new types.
11. Validation schemas.
12. Service functions.
13. Server Actions.
14. Exact conflict behavior.
15. Reschedule behavior confirming original preservation and replacement linkage.
16. Cancellation behavior confirming no hard delete.
17. Notification recipient resolution path.
18. UI routes/components.
19. Exact verification commands/results.
20. Explicit confirmation that Attendance mutation code was not changed.
21. Deferred Module 06B / Practice Work / Examination scope.
22. Final Git status and remaining uncommitted/untracked files.

## Stopping rule

Stop after Module 06A is implemented, verified, and documented.

Do not begin Practice Work, Examination, Report Cards, Analytics, or AI.

Do not commit or push unless explicitly instructed.

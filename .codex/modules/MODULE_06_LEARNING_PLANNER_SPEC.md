# Learning Is Fun ERP

## Codex Implementation Prompt

### Module 06A — Learning Planner Foundation

Implement **Module 06A — Learning Planner Foundation** in the existing `learning-is-fun` repository.

Do not redesign unrelated modules.

## Existing architecture

Reuse the repository's current architecture and conventions:

* Next.js App Router
* TypeScript
* Supabase PostgreSQL
* Supabase SSR
* Server Actions
* Zod
* Base UI / existing UI components
* Tailwind CSS
* TanStack Table
* Existing institute-scoped architecture
* Existing role authorization
* Existing Attendance implementation

The existing Attendance module must remain unchanged unless a compile-safe read-only import is absolutely required.

Do not modify existing applied migrations.

Do not commit or push unless explicitly instructed.

---

# 1. Confirm repository state before coding

Inspect the repository and confirm the following current-state assumptions before implementation:

* `student_assignments` is the authoritative active/historical batch membership model.
* Do not use legacy `student_batches`.
* Membership at an event date must satisfy:

```text
effective_from <= event_date
AND
(
  effective_to IS NULL
  OR effective_to >= event_date
)
```

* Parent relationships use:

```text
student_parent_links
→ parents
```

* Do not use `student_parents` for notification recipient resolution.

* Student authentication identity is derived through:

```text
students.profile_id
→ profiles.id
→ auth.users.id
```

* Parent authentication identity is derived through:

```text
parents.profile_id
→ profiles.id
→ auth.users.id
```

* Branches are structurally supported but may currently have no rows.
* `branch_id = NULL` means institute-wide where compatible with existing conventions.
* No test runner is currently configured; use the repository's existing SQL verification + lint + TypeScript + build process.

If repository inspection contradicts any of these assumptions, stop and report the conflict before implementing that specific part.

---

# 2. Module objective

The Learning Planner is the shared scheduling foundation for:

* Regular Classes
* Practice Work
* Practice Tests
* Mock Tests
* Exams
* Parent Meetings
* Holidays
* Special Classes
* Rescheduling
* Cancellation
* Notifications
* Schedule History

Future Practice Work and Examination modules must reuse this infrastructure instead of implementing their own scheduling engines.

---

# 3. Canonical schedule types

Use only:

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

Do NOT create `rescheduled_class`.

Rescheduling is a lifecycle action/status.

---

# 4. Canonical schedule statuses

Use:

```text
scheduled
rescheduled
cancelled
completed
```

---

# 5. Canonical schedule change types

Use:

```text
created
rescheduled
cancelled
restored
completed
```

---

# 6. Notification priorities

Use:

```text
normal
important
urgent
```

---

# 7. Notification channels

Initially support:

```text
in_app
email
```

Create recipient/delivery records only.

Actual email sending is deferred.

Design so these can be added later:

```text
sms
whatsapp
push
```

---

# 8. Migration strategy

Create a new migration and matching rollback.

Suggested logical names:

```text
supabase/migrations/<timestamp>_learning_planner_foundation.sql

supabase/rollbacks/<timestamp>_learning_planner_foundation_rollback.sql
```

Never edit existing applied migrations.

The migration must include:

* Tables
* Constraints
* Foreign keys
* Tenant-safe references
* Indexes
* Updated-at behavior where applicable
* RLS
* Policies
* Grants
* RPCs/functions
* SQL comments

---

# 9. Tenant-safe foreign keys

Inspect whether the following tables have composite uniqueness on:

```text
(id, institute_id)
```

Likely relevant:

```text
branches
batches
subjects
```

If missing and required for tenant-safe composite foreign keys, add targeted composite UNIQUE constraints in the new Learning Planner migration.

Do not add them merely for performance.

The rollback must remove those constraints after dropping dependent Learning Planner objects.

---

# 10. Table — class_schedules

Create:

```text
class_schedules
```

Purpose:

Recurring weekly batch schedule definitions.

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
day_of_week BETWEEN 1 AND 7

end_time > start_time

effective_to IS NULL
OR effective_to >= effective_from
```

Restrict `schedule_type` to canonical values.

Use tenant-safe foreign keys wherever compatible with existing schema.

---

# 11. Table — schedule_events

Create:

```text
schedule_events
```

Purpose:

Actual dated calendar events.

Fields:

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

* `original_event_id` self-references `schedule_events.id`.
* `exam_id` remains nullable UUID with no FK in Module 06A because Examination is not yet implemented.
* Schedule type restricted to canonical values.
* Status restricted to canonical values.

Time rules:

### Holiday

A holiday may be either:

```text
start_time IS NULL
AND
end_time IS NULL
```

or both may be populated.

### Other event types

Both start and end times are required.

Never allow only one of the two times.

Whenever times exist:

```text
end_time > start_time
```

---

# 12. Table — schedule_changes

Create:

```text
schedule_changes
```

Purpose:

Immutable schedule lifecycle/audit history.

Fields:

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

Restrict `change_type`.

Normal application flows must never update or delete schedule change records.

Use INSERT + SELECT policies only.

---

# 13. Table — notifications

Create:

```text
notifications
```

Fields:

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

Restrict notification priority.

---

# 14. Table — notification_recipients

Create:

```text
notification_recipients
```

Fields:

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

Add a unique constraint equivalent to:

```text
(notification_id, user_id, delivery_channel)
```

to prevent duplicate delivery rows.

---

# 15. Optional future table — class_session_notes

Do NOT build a full Class Notes feature or UI in Module 06A.

However, if creating the table now is consistent with the migration architecture and introduces no unwanted coupling, add:

```text
class_session_notes
```

Suggested fields:

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

Do NOT add `practice_work_id` yet because Practice Work does not exist.

If adding this table now would significantly expand scope, defer it and document the decision.

---

# 16. Branch semantics

Use repository-compatible branch handling.

Expected behavior:

```text
branch_id = NULL
```

means institute-wide.

An administrator with:

```text
profiles.branch_id IS NULL
```

may manage institute-wide records.

A branch-scoped administrator may manage:

* matching branch records
* institute-wide records where existing authorization rules allow them

Any supplied branch must belong to the authenticated institute.

Student and Parent visibility remains batch-membership-driven.

---

# 17. Required indexes

At minimum create appropriate indexes for:

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

Add useful composite indexes for real access patterns.

Avoid redundant indexes already covered by unique constraints.

---

# 18. RLS

Enable RLS on all new tables.

Follow the repository's existing style.

## Administrator

Use existing active-profile and role conventions.

Reuse:

```text
requireRole(DASHBOARD_ROLES)
```

at application level where applicable.

Database policies must independently enforce:

* active profile
* correct institute
* role
* branch scope where applicable

## Student schedule visibility

Student may SELECT `schedule_events` when:

```text
auth.uid()
→ profiles.id
→ students.profile_id
→ student_assignments
```

and the membership is valid on the event date:

```text
effective_from <= schedule_events.event_date

AND

(
  effective_to IS NULL
  OR effective_to >= schedule_events.event_date
)
```

and assignment batch matches event batch.

Students have no INSERT/UPDATE/DELETE access.

## Parent schedule visibility

Parent may SELECT events when:

```text
auth.uid()
→ parents.profile_id
→ student_parent_links
→ linked student
→ student_assignments
→ batch
→ schedule_event
```

using event-date-valid assignment membership.

Parents have no INSERT/UPDATE/DELETE access.

## Notifications

Users may read:

* notification recipient rows where `user_id = auth.uid()` / equivalent profile identity used by repository
* associated notification content only when they are a recipient

Administrators may create notification content and recipients only inside their tenant scope.

## schedule_changes

No normal UPDATE or DELETE policy.

Treat records as immutable audit history.

---

# 19. Atomic lifecycle RPCs

Use guarded transactional PostgreSQL RPCs for multi-record lifecycle operations.

Create RPCs/functions for at least:

```text
create_schedule_event
reschedule_schedule_event
cancel_schedule_event
complete_schedule_event
mark_schedule_notification_read
```

Use `SECURITY INVOKER` where feasible.

Add explicit grants.

## create_schedule_event

Atomically:

1. Validate tenant/role.
2. Recheck conflicts.
3. Insert schedule event.
4. Insert `schedule_changes` with `created`.
5. Create notification and recipients when required.
6. Return created event.

## reschedule_schedule_event

Atomically:

1. Load original event.
2. Reject cancelled event.
3. Reject completed event.
4. Validate institute/branch authorization.
5. Validate new date/time.
6. Recheck conflicts.
7. Update original event status to `rescheduled`.
8. Create NEW event.
9. New event must reference old event via `original_event_id`.
10. Preserve reschedule reason.
11. Insert immutable schedule change.
12. Create notification.
13. Create deduplicated recipient rows.
14. Return new event.

Never overwrite the original event's historical date/time as the sole record.

## cancel_schedule_event

Atomically:

1. Reject completed event.
2. Set status = `cancelled`.
3. Store cancellation reason.
4. Insert schedule change.
5. Create notification.
6. Resolve recipients.

Do not delete the event.

## complete_schedule_event

Set:

```text
status = completed
```

Insert audit record.

Do not mutate Attendance.

---

# 20. Conflict detection

Create:

```text
features/learning-planner/services/conflict-service.ts
```

Functions:

```text
checkBatchConflict()
checkRoomConflict()
checkEventConflict()
```

Exact overlap logic:

```text
existing.start_time < proposed.end_time

AND

existing.end_time > proposed.start_time
```

Rules:

* same institute
* same event date
* cancelled events ignored
* currently rescheduled/replaced event excluded
* adjacent slots allowed
* batch conflict blocks
* normalized same-room overlap blocks
* untimed holidays do not create normal time overlaps

Conflict checking must exist both:

* in service logic for useful UI errors
* inside atomic DB lifecycle operations to prevent race-condition conflicts

Return typed conflict results such as:

```ts
type EventConflictResult =
  | {
      hasConflict: false
    }
  | {
      hasConflict: true
      type: "batch" | "room"
      conflictingEventId: string
      message: string
    }
```

---

# 21. Shared types

Create:

```text
features/learning-planner/types/learning-planner.ts
```

Include:

```text
ScheduleType
ScheduleStatus
ScheduleChangeType
NotificationPriority
DeliveryChannel

ClassSchedule
ScheduleEvent
ScheduleChange
PlannerNotification
NotificationRecipient

CreateScheduleInput
UpdateScheduleInput

CreateEventInput
RescheduleEventInput
CancelEventInput
CompleteEventInput

PlannerFilters
EventConflictResult
```

No `any`.

---

# 22. Zod validation

Create:

```text
features/learning-planner/schemas/schedule-schema.ts

features/learning-planner/schemas/event-schema.ts

features/learning-planner/schemas/reschedule-schema.ts
```

Follow current project conventions including uppercase normalization where already used.

## Schedule validation

Validate:

* UUIDs
* academic year
* batch
* optional subject
* day 1–7
* canonical schedule type
* start/end time
* end > start
* effective dates
* room length
* normalized text

## Event validation

Validate:

* title
* event date
* schedule type
* status
* batch rules
* subject
* time rules
* description max length
* room max length

Holiday is the only all-day event type allowed in Module 06A.

## Reschedule

Validate:

* event ID
* new date
* new times
* reason required
* meaningful trimmed reason
* cannot reschedule cancelled/completed event

## Cancellation

Validate:

* event ID
* cancellation reason
* meaningful trimmed reason

---

# 23. Schedule service

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

* server-only
* SSR Supabase client
* authenticated profile
* institute derived from profile
* branch rules
* validate academic year
* validate batch
* validate subject
* no tenant identifiers trusted from browser input
* typed results

---

# 24. Event service

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

Lifecycle mutations must invoke atomic RPCs rather than executing unsafe multi-step application writes.

---

# 25. Notification service

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

Recipient resolution must use the actual schema:

```text
schedule_event.batch_id
→ student_assignments valid on event_date
→ students.profile_id
→ student_parent_links
→ parents.profile_id
```

Do NOT use `student_batches`.

Do NOT use `student_parents`.

Deduplicate users.

For Module 06A create pending:

```text
in_app
email
```

recipient rows.

Do not send actual emails yet.

---

# 26. Notification templates

At minimum support:

## New class

Title:

```text
Class Scheduled
```

## Reschedule

Title:

```text
Class Rescheduled
```

Message includes:

* event title
* old date/time
* new date/time
* reason

## Cancellation

Title:

```text
Class Cancelled
```

Include reason.

## Practice Test

```text
Practice Test Scheduled
```

## Mock Test

```text
Mock Test Scheduled
```

## Exam

```text
Exam Scheduled
```

## Parent Meeting

```text
Parent Meeting Scheduled
```

---

# 27. Server Actions

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

* Zod
* `requireRole(DASHBOARD_ROLES)`
* service layer
* typed discriminated action results
* controlled error mapping
* revalidatePath

Do not duplicate service logic.

---

# 28. Routes

Create:

```text
app/(protected)/learning-planner/page.tsx

app/(protected)/learning-planner/calendar/page.tsx

app/(protected)/learning-planner/schedules/page.tsx

app/(protected)/learning-planner/events/page.tsx

app/(protected)/learning-planner/notifications/page.tsx

app/(protected)/learning-planner/history/page.tsx
```

Add `loading.tsx` where consistent with existing project patterns.

---

# 29. UI foundation

Use existing components and manager patterns.

Build:

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

---

# 30. Overview screen

Show:

```text
Classes Today
Upcoming Events
Rescheduled
Cancelled
```

Also display:

```text
Next Event
Recent Schedule Changes
```

Use live DB data where backend is ready.

---

# 31. Responsive behavior

Desktop:

* calendar / agenda
* table where appropriate

Tablet:

* compact layout

Mobile:

* agenda/list layout

Do not force a wide weekly grid on mobile.

---

# 32. Navigation

Modify existing navigation architecture.

Add expandable:

```text
Learning Planner
```

with:

```text
Overview
Calendar
Class Schedule
Events
Notifications
Schedule History
```

Do not add Practice Work or Examinations implementation yet.

---

# 33. Attendance compatibility

Attendance is complete.

Do NOT modify Attendance mutation behavior.

Do NOT add Learning Planner dependencies inside Attendance in Module 06A.

Document the future optional link:

```text
attendance session
→ schedule_event_id
```

for a controlled future migration.

---

# 34. Recurring event materialization — defer to Module 06B

Module 06A stores recurring definitions in:

```text
class_schedules
```

Do not automatically create large ranges of future event rows.

Document Module 06B RPC:

```text
generate_schedule_events(
  from_date,
  to_date
)
```

Expected future behavior:

* materialize recurring schedule definitions into actual `schedule_events`
* prevent duplicate generation
* respect effective dates
* respect inactive schedules
* handle holidays
* generate only requested date ranges

Do NOT implement this RPC in Module 06A unless it is required to make the current UI functional.

---

# 35. Practice Work integration — future

Practice Work will later reference:

```text
schedule_event_id
```

Do not create:

```text
practice_sets
practice_questions
practice_assignments
practice_attempts
```

in Module 06A.

---

# 36. Examination integration — future

Examinations will reuse:

```text
schedule_events
```

and may later establish an FK for:

```text
schedule_events.exam_id
```

Do not implement Examination business logic now.

---

# 37. Student and Parent portals

Module 06A must provide RLS and read-service compatibility for Students and Parents.

Do NOT redesign Student or Parent dashboard pages in this module.

Portal UI integration is deferred.

---

# 38. SQL verification

No new JS test framework should be added solely for this module.

Add transactional SQL verification covering:

* valid constraints
* invalid enum values
* invalid time rules
* batch overlap
* room overlap
* adjacent events
* cancelled events ignored
* cross-institute rejection
* reschedule preserves original
* replacement event linkage
* schedule audit record
* notification creation
* recipient deduplication
* cancellation
* completion
* Student read isolation
* Parent read isolation
* Student mutation denial
* Parent mutation denial
* rollback correctness

---

# 39. Verification commands

Run at minimum:

```text
npm.cmd run lint

npx.cmd tsc --noEmit

npm.cmd run build

git diff --check
```

Also run:

* transactional SQL tests
* Supabase security advisor
* Supabase performance advisor
* full `git status`
* final diff review

Do not treat existing unrelated advisor warnings as Module 06A failures unless this module introduces or worsens them.

---

# 40. Definition of Done

Module 06A is complete only when:

* migration applied
* rollback validated
* new tables exist
* tenant-safe FKs work
* RLS enabled
* policies tested
* schedules CRUD works
* event CRUD/lifecycle works
* batch conflict detection works
* room conflict detection works
* original event preserved after reschedule
* immutable history works
* cancellations preserve event rows
* notifications and recipients work
* notification read flow works
* minimal Learning Planner UI works
* navigation works
* lint passes
* TypeScript passes
* production build passes
* diff check passes
* no Attendance regression
* no authentication regression
* no Masters regression
* no Student module regression

---

# 41. Explicitly deferred

Do not implement:

```text
Automatic recurring event generation
Drag-and-drop calendar
Actual email delivery
SMS
WhatsApp
Push notifications
Practice Work question bank
Practice attempts
Answer checking
Examination marks
Report cards
Exam analytics
Attendance schedule_event integration
Full Class Notes UI
Student Planner dashboard redesign
Parent Planner dashboard redesign
AI functionality
```

---

# 42. Final implementation order

Use this exact sequence:

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

# Required Codex final report

When implementation is complete, output:

## 1. Repository findings

Confirm actual schema relationships used.

## 2. Files created

List every file.

## 3. Files modified

List every modified file.

## 4. Migration

Give exact filename.

## 5. Rollback

Give exact filename.

## 6. Tables created

List tables.

## 7. Existing constraints added

List any composite tenant-safe constraints.

## 8. RLS

Summarize every new policy group.

## 9. RPCs

List functions and purpose.

## 10. Types

List important new types.

## 11. Schemas

List validation schemas.

## 12. Services

List service functions.

## 13. Actions

List Server Actions.

## 14. Conflict handling

Explain exact overlap and exclusion behavior.

## 15. Rescheduling

Confirm:

* original event remains
* original marked rescheduled
* replacement event created
* `original_event_id` correct
* change audit created

## 16. Cancellation

Confirm no hard deletion.

## 17. Notifications

Explain Student and Parent recipient path.

## 18. UI

List routes and major components.

## 19. Verification

Report exact command results.

## 20. Attendance compatibility

Explicitly confirm Attendance mutation code was not changed.

## 21. Deferred scope

List deferred Module 06B / Practice Work / Examination work.

## 22. Git status

Report remaining uncommitted/untracked changes.

Do not commit or push.

# Learning Is Fun ERP
## Codex Implementation Prompt
### Module 06B — Learning Planner Schedule Materialization

Implement **Module 06B — Learning Planner Schedule Materialization** in the existing `learning-is-fun` repository.

Do not redesign unrelated modules. Do not commit or push unless explicitly instructed.

## Preconditions

Before coding:

1. Read `.codex/modules/MODULE_06_LEARNING_PLANNER_SPEC.md`.
2. Read `.codex/modules/MODULE_06A_LEARNING_PLANNER_FOUNDATION_CODEX.md`.
3. Inspect the completed Module 06A implementation and live database objects.
4. Run `git status` and preserve all existing uncommitted work.
5. Confirm the five Module 06A tables exist and are the authoritative planner foundation:
   - `class_schedules`
   - `schedule_events`
   - `schedule_changes`
   - `notifications`
   - `notification_recipients`
6. Confirm `student_assignments` remains the authoritative batch membership model.
7. Confirm Attendance mutation logic remains unchanged.

If Module 06A is incomplete or the live schema differs materially from the specification, stop and report the exact conflict before continuing.

---

# 1. Objective

Build the recurring schedule materialization and calendar-operations layer on top of Module 06A.

Module 06B must:

- Materialize recurring `class_schedules` into dated `schedule_events`.
- Generate only within an explicitly requested date range.
- Be idempotent and duplicate-safe.
- Respect schedule effective dates.
- Ignore inactive schedules.
- Respect academic-year boundaries.
- Preserve manually created/rescheduled/cancelled events.
- Avoid creating duplicate replacements for rescheduled events.
- Support safe regeneration.
- Provide administrator actions and UI for generating schedule events.
- Improve calendar filtering and operational visibility.
- Preserve all Module 06A RLS, conflict, notification, and lifecycle behavior.

Do NOT implement Practice Work, Examination marks/results, Report Cards, or Attendance linkage in this module.

---

# 2. Core materialization rules

A recurring `class_schedule` defines a weekly pattern.

Example:

```text
Batch: Grammar Foundation
Day: Monday
Time: 17:00–18:00
Effective: 2026-08-10 onward
```

Materialization for a requested range creates one `schedule_events` row for each matching weekday inside the allowed date window.

Generation window must be the intersection of:

```text
requested from_date..to_date
∩ class_schedule effective_from..effective_to
∩ academic_year start_date..end_date
```

If the intersection is empty, generate nothing.

Only `class_schedules.is_active = true` may generate events.

---

# 3. Deterministic source linkage

Every generated event must retain a direct link to the source recurring schedule:

```text
schedule_events.class_schedule_id = class_schedules.id
```

Generated events must copy the authoritative schedule values at generation time:

- institute_id
- branch_id
- academic_year_id
- batch_id
- subject_id
- schedule_type
- room
- start_time
- end_time

Generate a sensible title from existing repository conventions, preferably using batch/subject labels where needed, but do not make title uniqueness part of duplicate detection.

---

# 4. Duplicate prevention

Materialization must be idempotent.

Running the same generation request twice must not create duplicate events.

Use a stable database-enforced uniqueness strategy for generated schedule instances.

Preferred logical uniqueness:

```text
(class_schedule_id, event_date)
```

for generated recurring events.

However, inspect existing Module 06A lifecycle behavior before adding the constraint. Rescheduled replacement events may have `original_event_id` and should not be blocked incorrectly.

If necessary, use a partial unique index applying only to source-generated instances that represent the original scheduled occurrence.

Do not depend only on application-side `SELECT then INSERT` checks.

Database-level duplicate prevention is required.

---

# 5. Reschedule-safe behavior

If a generated event for a source schedule/date was rescheduled:

- The original generated event remains with `status = 'rescheduled'`.
- The replacement event remains where Module 06A created it.
- Running materialization again must NOT create another original event for that same source schedule/date.
- Do not overwrite, delete, reactivate, or reset the rescheduled original.

Similarly, if a generated occurrence was cancelled:

- Keep the cancelled event.
- Do not recreate it during ordinary materialization.

If a generated occurrence was completed:

- Keep it completed.
- Do not recreate it.

Materialization fills genuinely missing occurrences only.

---

# 6. Manual event preservation

Events with:

```text
class_schedule_id IS NULL
```

are manual/special events and must never be modified by recurring materialization.

Do not delete or rewrite manual events.

---

# 7. Conflict behavior during generation

Reuse Module 06A conflict semantics.

For each candidate generated event:

- Check batch overlap.
- Check room overlap when room is populated.
- Ignore cancelled events.
- Allow adjacent non-overlapping events.

Do not silently create conflicting events.

Generation should return structured results distinguishing:

- generated
- already_exists
- skipped_conflict
- skipped_inactive
- skipped_outside_effective_range

Prefer a set-based SQL implementation where practical, but preserve useful per-occurrence reporting.

---

# 8. Holidays

Inspect the current Module 06A holiday model before implementing behavior.

For Module 06B:

- All-day `holiday` events must be able to suppress recurring class generation for affected dates when they apply to the same institute/branch scope.
- Do not delete already-existing events automatically when a holiday is later created.
- Existing events on newly declared holidays should be surfaced for administrator review, not silently changed.

If branch-level holiday semantics are ambiguous in the existing schema, follow the established Module 06A branch rules and document the behavior.

---

# 9. Database migration

Create a new migration and matching rollback using the repository naming convention.

Logical name:

```text
learning_planner_schedule_materialization
```

The migration may add:

- duplicate-prevention index/constraint
- materialization RPC
- supporting SQL helpers
- required grants/comments

Do not modify previous migration files.

Do not change Attendance tables.

---

# 10. Materialization RPC

Implement a guarded atomic RPC logically equivalent to:

```text
generate_schedule_events(
  p_from_date date,
  p_to_date date,
  p_batch_id uuid default null,
  p_class_schedule_id uuid default null
)
```

Use the actual repository naming and RPC conventions.

Requirements:

1. Authenticated administrator only.
2. Derive institute from authenticated profile/server trust boundary.
3. Enforce branch scope.
4. Validate `p_from_date <= p_to_date`.
5. Impose a reasonable maximum range to avoid accidental multi-year generation. Recommended default maximum: 90 days unless existing conventions justify another value.
6. Filter to active recurring schedules.
7. Intersect requested range with schedule effective dates and academic year dates.
8. Generate matching weekdays only.
9. Recheck duplicate state.
10. Recheck batch/room conflicts.
11. Insert missing `schedule_events`.
12. Insert `schedule_changes` rows with `change_type = 'created'` for generated events if Module 06A audit semantics require every event creation to be logged.
13. Respect `notification_required` policy intentionally. Do not flood users with notifications when bulk materializing routine future recurring classes unless explicitly required by current product behavior.
14. Return a structured JSON result.

Suggested result shape:

```json
{
  "generatedCount": 12,
  "existingCount": 4,
  "conflictCount": 1,
  "candidates": 17,
  "generatedEventIds": [],
  "conflicts": []
}
```

Do not expose cross-tenant identifiers.

---

# 11. Notification policy for materialization

Bulk recurring schedule generation must not generate dozens of duplicate routine notifications by default.

Recommended behavior:

- `generate_schedule_events` creates events with the correct `notification_required` value but does not send/create bulk class notifications solely because a recurring schedule was materialized.
- Explicit manual event creation/reschedule/cancellation continues using Module 06A notification lifecycle.

If current Module 06A implementation couples event creation RPC directly to notification creation, introduce a controlled internal parameter or dedicated generation path rather than bypassing authorization.

Document the final behavior.

---

# 12. Schedule lifecycle edits

Inspect current `updateSchedule()` and `deactivateSchedule()` behavior.

Module 06B must define safe future-occurrence behavior.

When recurring schedule details change:

- Existing historical events before today must remain unchanged.
- Completed/cancelled/rescheduled events must remain unchanged.
- Do not silently rewrite already materialized future events unless an explicit administrator action requests regeneration/update.

Add an explicit administrator workflow such as:

```text
Update recurring schedule
→ Save schedule definition
→ Optionally regenerate future missing occurrences
```

Do not implement destructive bulk rewriting in the default edit action.

---

# 13. Optional future-event refresh action

If it fits cleanly, implement an explicit action to refresh future generated events for one recurring schedule.

Safe rules:

- Only touch `scheduled` events.
- Only touch future events.
- Never touch manual events.
- Never touch rescheduled/cancelled/completed events.
- Never change event identity unnecessarily.
- Re-run conflict detection.

If this expands scope too much, defer and document it.

---

# 14. TypeScript types

Extend:

```text
features/learning-planner/types/learning-planner.ts
```

Add explicit types for:

- ScheduleGenerationInput
- ScheduleGenerationResult
- GeneratedOccurrenceResult
- ScheduleGenerationConflict
- CalendarRange

No `any`.

---

# 15. Zod validation

Add a schema for materialization input.

Validate:

- valid ISO dates
- `fromDate <= toDate`
- maximum generation range
- optional valid batch UUID
- optional valid class schedule UUID

Normalize and return typed field errors using existing Server Action conventions.

---

# 16. Service layer

Add a focused service, or extend the existing schedule service if that matches current architecture.

Preferred functions:

```text
generateScheduleEvents()
getMaterializationPreview()
```

`getMaterializationPreview()` may be implemented if useful to show:

- expected candidate count
- existing event count
- possible conflicts

Do not duplicate conflict logic already implemented in Module 06A.

---

# 17. Server Action

Add an authenticated administrator Server Action such as:

```text
generateScheduleEventsAction()
```

Requirements:

- Zod parse
- `requireRole(DASHBOARD_ROLES)`
- server-derived institute/branch scope
- service/RPC call
- controlled error mapping
- revalidate planner routes
- typed discriminated result

Revalidate at minimum:

```text
/learning-planner
/learning-planner/calendar
/learning-planner/events
/learning-planner/schedules
```

---

# 18. UI — Class Schedule generation controls

On the Class Schedule page, add a clear administrator action:

```text
Generate Calendar Events
```

Dialog/form fields:

- From Date
- To Date
- Optional Batch filter
- Optional recurring schedule filter where appropriate

Show a warning that generation is duplicate-safe and will not replace rescheduled/cancelled/completed occurrences.

After generation show:

- generated count
- existing count
- conflict count

If conflicts exist, provide a concise conflict list with date/time/batch/room and a link to the relevant event if possible.

---

# 19. Calendar improvements

Improve the current calendar/agenda foundation without adding drag-and-drop.

Support filters for:

- date range
- batch
- event type
- status

Desktop may use calendar/agenda grouping.

Mobile should remain list/agenda-first.

Every rendered list item must have a stable unique React key.

Audit all new and existing Learning Planner `.map()` renderers while touching these components to avoid React duplicate/missing-key warnings.

Prefer:

```tsx
key={event.id}
```

or another stable database identifier.

Do not use array indexes where a stable identifier exists.

---

# 20. Operational indicators

Update the Learning Planner overview using live data where feasible:

- Classes Today
- Upcoming Events
- Rescheduled
- Cancelled
- Unmaterialized recurring schedules / next generation window if useful

Do not redesign the whole dashboard.

---

# 21. Performance

Materialization should be efficient for normal batch schedules.

Requirements:

- Avoid N+1 browser/server round trips.
- Prefer set-based SQL for weekday/date generation.
- Use `generate_series` in PostgreSQL where appropriate.
- Use existing indexes.
- Do not generate unbounded future events.

Run Supabase performance advisor after migration.

Expected unused-index notices on empty tables are not failures unless Module 06B introduces a clearly redundant index.

---

# 22. RLS and security

Preserve Module 06A RLS.

Any new RPC must:

- enforce authentication
- enforce administrator role
- enforce institute ownership
- enforce branch restrictions
- avoid trusting browser-supplied institute IDs
- use `SECURITY INVOKER` where feasible
- revoke PUBLIC/anon execution
- grant only required authenticated execution

Do not weaken existing policies to make generation work.

---

# 23. Transactional SQL tests

Extend planner SQL tests to cover:

1. Generates expected weekday occurrences.
2. Requested range outside effective dates generates nothing.
3. Inactive schedule generates nothing.
4. Academic-year boundary respected.
5. Duplicate generation is idempotent.
6. Existing scheduled occurrence not duplicated.
7. Cancelled occurrence not recreated.
8. Rescheduled occurrence not recreated.
9. Completed occurrence not recreated.
10. Manual event untouched.
11. Adjacent events allowed.
12. Batch conflict skipped/reported.
13. Room conflict skipped/reported.
14. Cross-institute generation rejected.
15. Branch scope enforced.
16. Student cannot call generation RPC.
17. Parent cannot call generation RPC.
18. Rollback remains valid.

Do not add a new JS test runner solely for this module.

---

# 24. Verification

Run at minimum:

```text
npm.cmd run lint
npx.cmd next typegen
npx.cmd tsc --noEmit
npm.cmd run build
git diff --check
```

Also run:

- transactional SQL planner tests
- Supabase security advisor
- Supabase performance advisor
- `git status`
- final diff review

Fix any React key warnings introduced by or discovered in the Learning Planner implementation.

No Attendance regression is permitted.

---

# 25. Explicitly out of scope

Do NOT implement:

- Practice Work question bank
- Practice answers/self-correction
- Student practice attempts
- Examination marks/results
- Report Cards
- Exam analytics
- Attendance `schedule_event_id` integration
- Drag-and-drop calendar
- Actual email delivery worker
- SMS/WhatsApp/push delivery
- AI recommendations
- Teacher/Class Session Notes UI unless already approved separately

---

# 26. Definition of Done

Module 06B is complete only when:

- migration applied successfully
- rollback validated
- materialization RPC exists
- generation is date-range bounded
- recurring weekday expansion works
- effective dates respected
- academic year respected
- inactive schedules ignored
- duplicate generation is database-safe
- rescheduled/cancelled/completed occurrences are preserved and not recreated
- manual events are untouched
- conflict reporting works
- generation UI works
- planner calendar shows generated events
- filters work
- React rendered lists have stable keys
- RLS/security verified
- lint passes
- typegen passes
- TypeScript passes
- production build passes
- diff check passes
- SQL tests pass
- no Attendance mutation code changed
- no commit or push performed

---

# 27. Required final report

When finished, report:

## 1. Repository state

- branch
- preserved uncommitted files

## 2. Files created

List all files.

## 3. Files modified

List all files.

## 4. Migration

Exact filename.

## 5. Rollback

Exact filename.

## 6. Database changes

Indexes/constraints/functions added.

## 7. Materialization algorithm

Explain requested/effective/academic-year date intersection and weekday generation.

## 8. Duplicate strategy

Explain database-level protection.

## 9. Reschedule/cancel/complete preservation

Confirm these occurrences are never recreated.

## 10. Conflict handling

Explain batch/room conflict behavior.

## 11. Holiday behavior

Explain suppression/review behavior.

## 12. Notification behavior

Confirm whether bulk materialization creates or suppresses routine notifications.

## 13. Services/actions

List functions.

## 14. UI

List changed routes/components.

## 15. React key audit

Report any key-warning fixes made while auditing planner render lists.

## 16. Tests

Report exact SQL and application verification results.

## 17. Advisors

Summarize new relevant security/performance findings.

## 18. Attendance compatibility

Explicitly confirm Attendance mutation behavior was unchanged.

## 19. Deferred work

List remaining later-module work.

## 20. Git status

Report all remaining uncommitted/untracked changes.

Do not commit or push.

# Module: Learning Planner Exam Results Publishing

## Objective

Add a focused Exam Results Publishing feature attached to existing Learning Planner `schedule_events` where `schedule_type = 'Exam'`. Do not implement the postponed full Examination / Marks / Report Card module.

The workflow must be:

Planner Exam Event -> Enter Marks -> Review Exam-wise Result -> Publish -> Student/Parent visibility -> Admin PDF/Print/Share

## Core principles

- Reuse existing Learning Planner Exam events as the authoritative exam definition.
- Do not create a parallel exam scheduling system.
- Draft marks are Administrator-only.
- Student and Parent visibility begins only after publication.
- Results are institute-scoped and batch/class scoped.
- Highest/lowest/average must be computed from the same Exam event and published result set.
- Corrections after publication must be auditable; do not silently overwrite published history.
- Students/Parents must never receive the full class result sheet.
- Full Examination/Report Card functionality remains postponed.

## Before implementation

Inspect the repository and live database for any existing tables, RPCs, routes, types, or services named or related to:

- exams
- examination
- marks
- results
- report_cards
- grades

Reuse compatible existing objects if present. Do not duplicate existing schema.

Also inspect existing Learning Planner `schedule_events`, batches, subjects, students, student assignments, Parent links, Student Dashboard, Parent fee/readiness patterns, RLS helpers, PDF utilities, and print styles.

## Eligible events

Only `schedule_events` with:

- `schedule_type = 'Exam'`
- valid institute ownership
- a relevant batch/class context

may have Exam Results.

Cancelled or superseded/rescheduled original exam events must not accept fresh marks unless the event is the current active exam occurrence. Preserve existing Learning Planner lifecycle semantics.

## Data model

Use the smallest safe normalized model. A recommended design is:

### `exam_result_sets`

One row per Planner Exam event.

Suggested fields:

- `id uuid primary key`
- `institute_id uuid not null`
- `schedule_event_id uuid not null`
- `academic_year_id uuid not null`
- `batch_id uuid not null`
- `subject_id uuid null` (or derived/snapshotted as appropriate)
- `max_marks numeric not null check (max_marks > 0)`
- `status text not null` in `draft`, `published`, `superseded`
- `published_at timestamptz null`
- `published_by uuid null`
- `created_by uuid not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

There must be at most one current non-superseded result set for an Exam event.

### `exam_student_results`

One row per Student in one result set.

Suggested fields:

- `id uuid primary key`
- `institute_id uuid not null`
- `exam_result_set_id uuid not null`
- `student_id uuid not null`
- `marks_obtained numeric not null`
- `percentage numeric`
- `grade text null`
- `remarks text null`
- `created_at`
- `updated_at`

Constraints:

- one row per Student per result set
- `marks_obtained >= 0`
- `marks_obtained <= max_marks` must be enforced server-authoritatively through RPC logic and/or schema design
- Student must belong to the relevant Exam batch/class/institute

### Publication / correction audit

Published data must not be silently overwritten.

Prefer one of these safe approaches:

1. immutable published result-set versions where a correction creates a new draft version and the old published set becomes `superseded`; or
2. a dedicated result-change audit table recording old/new values, actor, reason, and timestamp.

Versioned immutable publication is preferred if it fits the existing architecture cleanly.

## Marks entry workflow

Administrator opens a Learning Planner Exam event and sees an action such as `Exam Results` / `Enter Marks`.

The marks-entry screen must:

- resolve the Exam event server-side
- verify it is an eligible Exam event
- load only Students belonging to the relevant Batch/Class at the exam date
- prefill Student name/admission number
- accept `max_marks`
- accept `marks_obtained`
- optionally accept grade and remarks
- validate every value server-side
- prevent cross-batch/cross-institute Student injection
- allow saving as draft
- allow reopening/editing draft results

Do not trust Student IDs, institute IDs, batch IDs, exam dates, or max marks from the browser without server-side validation.

## Publication workflow

Publishing must be explicit.

Before publish:

- Administrator reviews the exam-wise result table.
- All required Student rows must be valid.
- No result may exceed maximum marks.
- Highest/lowest/average are computed from the result set.

On publish:

- status becomes `published`
- `published_at` and `published_by` are recorded
- Student and linked Parent read visibility becomes available
- no answer/marks data from other Students becomes exposed through Student/Parent RLS

Drafts must remain Administrator-only.

## Corrections after publication

If the Administrator needs to correct published marks:

- require a correction reason
- preserve the previously published values/history
- produce an auditable new publication/version
- Student/Parent views should show the currently active published version
- Admin history should retain old versions/corrections

Do not `UPDATE` published marks in place without an audit trail.

## Exam-wise statistics

For each published Exam result set calculate server-side:

- `studentCount`
- `maxMarks`
- `highestMarks`
- `lowestMarks`
- `averageMarks`
- `averagePercentage`

`highestMarks` must be:

`MAX(marks_obtained)` among the same active published result set only.

Do not mix drafts, superseded versions, other batches, subjects, or exam events.

## Student view

Add a dedicated Student route:

- `/student/results`

Student may view only their own published results.

Each result should show:

- Exam name/title
- Exam date
- Subject
- Marks obtained
- Maximum marks
- Highest mark for that Exam
- Percentage
- Grade, if present
- Remarks, if present
- Published date

Student must not see another Student's marks or the full exam result sheet.

## Student Dashboard

Add a compact `Recent Results` section, ideally latest 3-5 published results.

Show:

- Exam title
- Exam date
- Subject
- Student marks / maximum marks
- Highest mark
- Percentage/grade

Only published results may appear.

Do not break existing quote, schedule, attendance, practice, fee, holiday, or notification widgets.

## Parent view

Add Parent result visibility using existing linked-child authorization patterns.

Preferred route:

- `/parent/results`

If there is no full Parent Dashboard yet, this route may be implemented independently without inventing unrelated Parent portal pages.

Parent may see only published results for linked children in the same institute.

For each linked child show the same fields as Student view.

Do not expose the full class result table to Parent users.

## Parent Dashboard readiness

If a Parent Dashboard is later built, services/types should make it straightforward to show the latest linked-child results there. Do not build a fake Parent dashboard merely for this module.

## Administrator routes

Add focused routes such as:

- `/learning-planner/exam-results`
- `/learning-planner/exam-results/[eventId]`

or equivalent structure consistent with the repository.

The exam-wise Administrator view must show:

- Exam title
- Exam date
- Academic Year
- Batch/Class
- Subject
- Maximum marks
- Publication status
- Student count
- Highest mark
- Lowest mark
- Average mark
- Student-wise result table
- Draft/publish/correction controls as authorized
- Print / PDF actions for published results

## Navigation

Do not add a top-level Examination module.

Expose Exam Results under Learning Planner only, e.g.:

Learning Planner
- Overview
- Calendar
- Class Schedules
- Events
- Exam Results
- Holidays
- Notifications
- History

Student navigation may gain `My Results` after route/RLS tests pass.

Parent navigation may gain `Results` only if `/parent/results` is genuinely implemented and authorized.

## PDF / print requirements

Administrator must be able to generate a shareable exam-wise PDF for a published result set.

### Internal Exam Result Sheet PDF

Include:

- Institute name/branding/logo if available
- Exam title
- Exam date
- Academic Year
- Batch/Class
- Subject
- Maximum marks
- Student count
- Highest mark
- Lowest mark
- Average mark
- Student-wise rows: admission number, Student name, marks, percentage, grade/result if present
- Publication date
- Generated date/time
- Page numbering for multi-page output

Use authoritative server-side published result data, not mutable browser state.

Do not expose this full-class PDF to Students or Parents.

### Individual Student Result PDF

Administrator should also be able to generate/share a single-Student result PDF for a published Exam.

Include only that Student's information plus exam summary values such as highest mark.

This PDF may later be exposed to the Student/Parent if authorization is implemented safely.

### PDF implementation quality

- Prefer existing repository PDF/print utilities if present.
- If generating PDFs in application code, use a server-safe implementation.
- Avoid client-only screenshot-to-PDF if it compromises authoritative data or print quality.
- Result sheet must print cleanly on A4.
- Handle long Student names and multi-page tables.

## Optional grade behavior

Do not invent a complex grade scale unless one already exists.

For this module:

- grade may be manually entered, or
- if an existing grading utility/configuration exists, reuse it.

Marks, max marks, percentage, and highest mark are mandatory. Grade is optional.

## RLS and authorization

RLS must enforce:

Administrator:
- same-institute full read of result sets/student results
- mutations only through authorized server actions/RPCs

Student:
- own published result rows only
- no draft rows
- no other Students

Parent:
- published result rows only for linked children
- no drafts
- no unrelated Students

Anonymous:
- no access

Prefer explicit authenticated grants and narrowly scoped policies/RPCs. Do not trust browser-supplied institute IDs.

## Server-authoritative RPCs / services

Use atomic server-side operations for at least:

- create/update draft result set
- save Student marks
- publish result set
- create correction version / corrected publication

Services should expose safe read helpers for:

- Admin exam result listing
- Admin exam result detail/statistics
- Student published results
- Parent linked-child published results
- Student dashboard recent results
- PDF result payload

## Notifications

Do not introduce a second notification architecture.

If easy and consistent with existing Learning Planner notifications, publication may create/queue a result-published notification to the relevant Student/Parent recipients. Do not make external email/WhatsApp delivery a blocker for publishing results.

If actual notification delivery is not currently available, persist/use the existing in-app notification framework only and report external delivery as deferred.

## Event lifecycle compatibility

- Rescheduled Exam: result entry should attach only to the active/current Exam event.
- Cancelled Exam: cannot publish marks.
- Completed status may coexist with result publication if existing planner lifecycle uses it.
- Result publication must not mutate Attendance.
- Result publication must not alter schedule materialization.

## Existing dashboard / fee / practice compatibility

Do not regress:

- Authentication
- Attendance
- Learning Planner materialization
- India Holidays
- Practice Work
- Fees Management
- Student Dashboard
- Dashboard/Navigation rework

## Testing requirements

### SQL / database tests

Cover at least:

- only `schedule_type='Exam'` events accepted
- same-institute validation
- Batch/Class Student membership validation
- marks >= 0
- marks <= max marks
- duplicate Student result rejection
- draft privacy
- publication transition
- Student self visibility after publish
- Parent linked-child visibility after publish
- unrelated Student/Parent isolation
- anonymous denial
- highest mark correctness
- lowest mark correctness
- average correctness
- drafts excluded from statistics visible to Student/Parent
- correction/version audit preservation
- superseded publication not treated as current
- cancelled/superseded Exam event restrictions
- cross-institute injection blocked

### Application tests / verification

Verify:

- Admin can open Exam Results from a Planner Exam event
- non-Exam events do not offer marks entry
- correct Batch Students load
- validation messages are visible
- draft saves and reloads
- publication works
- Student sees only own published result
- Parent sees only linked child's published result
- Student Dashboard shows exam date + marks + max + highest + percentage/grade
- Admin exam-wise summary shows highest/lowest/average
- Internal PDF contains full result sheet
- Individual PDF contains one Student only
- no full-class PDF is accessible to Student/Parent

If authenticated browser automation is unavailable, clearly report browser checks as DEFERRED rather than claiming PASS.

## Verification commands

Run:

- relevant SQL test suite(s)
- existing Learning Planner Foundation tests
- existing Learning Planner Materialization tests
- India Holidays tests
- `npm.cmd run lint`
- `npx.cmd next typegen`
- `npx.cmd tsc --noEmit`
- `npm.cmd run build`
- `git diff --check`

## Migration and rollback

If new schema is required:

- create one or more forward migrations using the repository's established naming workflow
- create matching rollback files
- rollback must protect published financial/academic history where destructive reversal would be unsafe
- add transactional SQL tests

## Deferred / explicitly out of scope

Do NOT implement:

- a separate Examination scheduling system
- question papers
- seating plans
- hall tickets
- invigilation
- full Marks module outside Planner Exam events
- report cards
- term/semester aggregation
- promotion decisions
- transcript generation
- board-exam workflow

These remain future/full Examination scope.

## Completion report

Report:

1. repository synchronization/state
2. schema objects created/modified
3. migrations/rollbacks/tests
4. RPCs/services/actions added
5. eligible Exam-event validation
6. marks-entry workflow
7. publication workflow
8. correction/audit strategy
9. highest/lowest/average implementation
10. Student route/dashboard integration
11. Parent route/read integration
12. Administrator exam-wise result page
13. PDF/print implementation
14. RLS and security verification
15. regression test results
16. browser test status
17. deferred items
18. `git status`

Do not commit or push unless explicitly instructed later.
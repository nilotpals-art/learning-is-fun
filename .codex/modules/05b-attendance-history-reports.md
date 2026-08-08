# Module 05B – Attendance History & Reports

## Status

Implemented / Approved

---

# Objective

Implement Attendance History, Attendance Summaries, Attendance Percentages, Administrator reporting, and Student Attendance Calendar for Learning Is Fun ERP.

Module 05A provides the authoritative Daily Attendance transaction model.

Module 05B must reuse:

* `public.student_attendance`
* `public.student_assignments`

Do not create a second Attendance transaction table.

Do not create reporting tables or persisted summary tables.

Do not recalculate historical Attendance ownership from the Student's current assignment.

---

# Core Historical Rule

Attendance reporting must remain historically correct even when a Student later:

* changes Batch;
* changes Class;
* changes School;
* changes Board;
* changes Academic Year.

Attendance already stores:

* `student_assignment_id`
* `student_id`
* `academic_year_id`
* `batch_id`
* `institute_id`
* `attendance_date`

Reports must use these persisted historical identifiers.

Correct relationship:

`Attendance → stored Student Assignment / Academic Year / Batch`

Do NOT use:

`Student → current assignment`

to interpret historical Attendance.

---

# Access

Administrator only for Module 05B reporting screens.

Future Student and Parent Attendance access will be read-only and will reuse the same reporting foundation.

Do not implement Student or Parent Attendance mutation access.

---

# Attendance Statuses

The only Attendance statuses are:

* Present
* Late
* Absent
* Leave

Do not reintroduce:

* Holiday
* Class Rescheduled

Those belong to the future Class Schedule / Calendar module.

---

# Attendance Business Rule

**Late counts as Present for all Attendance calculations.**

Important:

The stored Attendance status must remain:

`Late`

Do not convert a Late record to Present.

Late remains visible as a separate operational status.

Only reports, summary metrics, and percentage calculations aggregate Late into Present.

---

# Effective Present

Define:

`Effective Present = Present + Late`

Every Attendance summary should make this clear where practical.

Recommended display:

* Present
* Late
* Effective Present
* Absent
* Leave
* Attendance %

Example:

* Present: 24
* Late: 3
* Effective Present: 27
* Absent: 2
* Leave: 1
* Attendance %: 90.0%

---

# Attendance Percentage

Use this formula throughout the ERP:

`Attendance % = (Present + Late) / Total Attendance Records × 100`

Where:

`Total Attendance Records = Present + Late + Absent + Leave`

Therefore:

* Present counts as attended.
* Late counts as attended.
* Absent does not count as attended.
* Leave does not count as attended.

Rules:

* Round display to one decimal place.
* If Total Attendance Records = 0, display `—`.
* Do not display `0%` when no Attendance exists.
* Do not persist Attendance percentages.
* Always calculate from authoritative Attendance records.

Example:

Present: 18

Late: 2

Absent: 1

Leave: 1

Total: 22

Effective Present:

`18 + 2 = 20`

Attendance Percentage:

`20 / 22 × 100 = 90.9%`

---

# Percentage Consistency

Use the same formula for:

* Student Attendance Summary
* Batch Attendance Summary
* Daily Attendance Summary
* Academic Year Summary
* Dashboard Attendance metrics
* Future Student Portal
* Future Parent Portal
* Attendance analytics

Do not implement different formulas in different parts of the ERP.

---

# Batch Percentage

For Batch totals, calculate weighted overall Attendance:

`(All Present + All Late) / All Attendance Records × 100`

Do not calculate the main Batch percentage by simply averaging Student percentages.

If an average of individual Student percentages is ever shown, label it explicitly as:

`Average Student Attendance`

and keep it separate from:

`Overall Batch Attendance`

---

# Main Routes

Use:

`/attendance/history`

and:

`/attendance/reports`

Keep Daily Attendance at:

`/attendance`

Recommended sidebar structure:

Attendance

* Daily Attendance
* Attendance History
* Attendance Reports

Use the expandable sidebar system.

---

# Attendance History

Administrator must be able to review saved Attendance transactions.

Display:

* Attendance Date
* Admission Number
* Student Name
* Academic Year
* Batch
* Class where useful
* Board where useful
* Attendance Status
* Remarks
* Marked By
* Updated At
* Actions

Class and Board must come from the Attendance record's stored Student Assignment relationship.

Do not look up the Student's current assignment.

---

# Historical Batch Example

Student history:

Batch A:

01-Apr-2026 → 31-Aug-2026

Batch B:

01-Sep-2026 → Current

Attendance:

15-Aug-2026 → Batch A

15-Sep-2026 → Batch B

Reports must permanently show:

15-Aug → Batch A

15-Sep → Batch B

even if the Student is currently in Batch B or later moves again.

---

# Attendance History Filters

Support:

* Date From
* Date To
* Academic Year
* Batch
* Student
* Attendance Status
* Search

Optional only where it improves usability:

* Class
* Board

Do not overcrowd the filter area.

---

# Search

Search by:

* Admission Number
* Student Name

Where useful:

* Batch Name

Search must remain server-side and institute-scoped.

Do not load lifetime Attendance into a Client Component for searching.

---

# Pagination

Attendance History must use server-side keyset pagination.

Order:

`attendance_date DESC, id DESC`

Cursor:

* attendance date
* Attendance ID

Default page size:

25

Allowed page sizes:

* 25
* 50

Maximum:

100

Changing filters resets the cursor.

Do not use deep offset pagination for growing Attendance data.

---

# Attendance History Edit

Attendance History may expose Edit Attendance.

Reuse the existing Module 05A edit workflow.

Do not create another update implementation.

Editable:

* Status
* Remarks

Immutable:

* Student
* Attendance Date
* Student Assignment
* Academic Year
* Batch
* Institute

Editing status must immediately affect reports because percentages are calculated dynamically.

---

# Student Attendance Report

Filters:

* Student
* Academic Year
* Date From
* Date To

Display Student identity:

* Student Name
* Admission Number

Summary:

* Present
* Late
* Effective Present
* Absent
* Leave
* Total Attendance Records
* Attendance %

Daily history:

* Date
* Batch
* Status
* Remarks where Administrator access permits

---

# Student Attendance Calendar

Include a read-only monthly calendar in the Student report.

Colors:

Present → Green

Late → Amber

Absent → Rose / Red

Leave → Blue

Requirements:

* Always display a text/legend in addition to color.
* Calendar does not create or modify Attendance.
* Calendar reads from authoritative Attendance records.
* Calendar may require a selected Academic Year or bounded date range.

Late must remain visually Late (Amber), even though it counts toward Effective Present.

Do not display Late dates as green.

---

# Batch Attendance Report

Filters:

* Academic Year
* Batch
* Date From
* Date To

Summary:

* Total Students represented
* Total Attendance Records
* Present
* Late
* Effective Present
* Absent
* Leave
* Overall Attendance %

Student summary rows:

* Admission Number
* Student
* Present
* Late
* Effective Present
* Absent
* Leave
* Total
* Attendance %

Use the weighted overall Batch percentage for the main Batch metric.

---

# Daily Attendance Report

Filters:

* Attendance Date
* Batch

Display:

* Admission Number
* Student
* Status
* Remarks

Summary:

* Total Students
* Present
* Late
* Effective Present
* Absent
* Leave
* Attendance %

Do not rebuild the historical roster from current Student assignments.

Use saved Attendance transactions.

---

# Academic Year Attendance Report

Filter:

* Academic Year
* Optional Date Range

Display institute-scoped totals:

* Total Attendance Records
* Present
* Late
* Effective Present
* Absent
* Leave
* Overall Attendance %

Optional grouping:

* Batch

Do not build complex BI functionality in Module 05B.

---

# Attendance Status Report

Filters:

* Date From
* Date To
* Attendance Status

Examples:

* All Absent Students
* All Late Students
* All Students on Leave

Display:

* Date
* Student
* Admission Number
* Batch
* Status

Late rows remain Late.

Do not transform them into Present rows.

---

# Reporting Architecture

Use a hybrid reporting architecture.

## Attendance History

Use direct RLS-protected server-side Supabase queries.

Requirements:

* Explicit institute filter.
* Filters applied server-side.
* Keyset pagination.
* Join only required historical relationships.
* Return only current page to Client Component.

## Aggregate Reports

Use narrow SQL aggregate RPCs for:

* Student Attendance Summary
* Batch Attendance Summary
* Daily Attendance Summary
* Academic Year Attendance Summary
* Attendance Status Summary

Prefer `SECURITY INVOKER` so Attendance RLS remains authoritative.

Do not use a service-role client for reports.

---

# Aggregate RPC Calculations

All aggregate RPCs must return enough values to derive or directly return:

* `present_count`
* `late_count`
* `effective_present_count`
* `absent_count`
* `leave_count`
* `total_count`
* `attendance_percentage`

Where:

`effective_present_count = present_count + late_count`

and:

`attendance_percentage = effective_present_count / total_count × 100`

If total_count = 0:

Attendance percentage should be returned as NULL or handled as unavailable rather than zero.

Do not persist these aggregates.

---

# Reporting Indexes

Module 05B uses reporting indexes supporting:

* History cursor pagination
* Batch/date-range reports
* Academic-Year/date-range reports
* Status/date-range reports

Do not remove existing Attendance integrity indexes.

Reassess redundant index usage only after representative production volume exists.

---

# RLS and Security

Preserve Module 05A security.

Attendance:

* RLS enabled.
* No anonymous access.
* Administrator institute-scoped reads.
* Direct authenticated mutation denied.
* Writes only through approved guarded RPCs.

Reports must:

* explicitly filter institute ID server-side;
* validate Student ownership;
* validate Batch ownership;
* validate Academic Year ownership;
* validate Status;
* validate date ranges.

Do not expose:

* raw SQL errors
* security internals
* Profile IDs
* service credentials

Attendance Remarks remain Administrator-only unless separately approved for Student/Parent portals.

---

# Future Student Portal Compatibility

Future Student Attendance access must resolve:

`auth.uid()`
→ `profiles.id`
→ `students.profile_id`
→ Student
→ Student Attendance

Student may only view their own Attendance.

Use the same Attendance calculation:

`Present + Late = Effective Present`

---

# Future Parent Portal Compatibility

Future Parent Attendance access must resolve:

`auth.uid()`
→ Parent Profile
→ Parent Entity
→ Student Parent Links
→ selected linked Student
→ Attendance

One Parent may access multiple linked children.

Do not authorize Parent Attendance using browser-supplied email.

Use the same Effective Present rule.

---

# Dashboard Compatibility

Future Dashboard Attendance widgets must use the same business rule.

If showing:

`Present Today`

the metric should either clearly be:

* Present
* Late
* Effective Present

or label the combined metric:

`Present Today (including Late)`

Do not silently add Late to Present without a clear label.

---

# Status Presentation

Use:

Present → Green

Late → Amber

Absent → Rose / Red

Leave → Blue / Slate

Effective Present is a calculated summary metric and is not an Attendance status.

Do not create:

`Effective Present`

as a stored Student Attendance status.

---

# UI Design System

Use Attendance theme:

Deep Green / Emerald.

Requirements:

* bold deep-colored page headers;
* colorful summary cards;
* strong table headers;
* modern filter bars;
* status badges;
* responsive desktop/mobile layout;
* expandable sidebar;
* clear loading and empty states.

---

# Empty States

Examples:

`No attendance records found for the selected period.`

`No attendance has been recorded for this Student.`

When no summary records exist:

Attendance % → `—`

not:

`0%`

---

# Validation

Use Zod.

Validate:

* Date From
* Date To
* Date From <= Date To
* Student UUID
* Academic Year UUID
* Batch UUID
* Attendance Status
* Cursor
* Page size

All ownership checks remain server-side.

---

# Existing Code to Reuse

Reuse:

* `ATTENDANCE_STATUSES`
* `AttendanceStatus`
* Module 05A edit Attendance action
* `update_student_attendance`
* Attendance historical joins
* `requireRole`
* `PageHeader`
* `StatCard`
* `EmptyState`
* `Badge`
* `Card`
* `Table`
* `Dialog`
* Input/Select controls
* Toast feedback
* Attendance UI theme

Do not duplicate Attendance status definitions.

---

# Export

Do not implement Excel or PDF export in Version 1 unless separately approved.

Correct on-screen reporting comes first.

---

# Attendance Edit Audit Trail

Dedicated immutable Attendance correction auditing is deferred.

Do not introduce audit tables in Module 05B.

A later module may record:

* previous status
* new status
* previous remarks
* new remarks
* changed by
* changed at

---

# Acceptance Criteria

Module 05B is complete when:

* Attendance History works.
* Historical Batch information remains correct after Batch transfers.
* Student Attendance Summary works.
* Batch Attendance Summary works.
* Daily Attendance Report works.
* Academic Year Attendance Report works.
* Attendance Status Report works.
* Attendance Calendar works.
* Late remains stored/displayed as Late.
* Late counts toward Effective Present.
* Effective Present = Present + Late.
* Attendance Percentage uses Present + Late.
* Leave lowers Attendance Percentage.
* Empty denominator displays `—`.
* Search and filters are institute-safe.
* Pagination is server-side.
* Attendance edits reuse Module 05A.
* No duplicate Attendance storage exists.
* No persisted percentage exists.
* RLS remains unchanged and secure.
* Desktop/mobile layouts work.
* Lint passes.
* TypeScript passes.
* Build passes.
* `git diff --check` passes.

---

# Testing

Calculation tests:

1. All Present → 100.0%
2. All Late → 100.0%
3. Present + Late only → 100.0%
4. All Absent → 0.0%
5. All Leave → 0.0%
6. Mixed:

   * Present 18
   * Late 2
   * Absent 1
   * Leave 1
     → 90.9%
7. Zero records → `—`

Verify:

* Late displayed separately.
* Effective Present equals Present + Late.
* Late calendar dates remain Amber.
* Historical Batch stays unchanged after transfer.
* Weighted Batch overall percentage is correct.
* Pagination remains stable.
* Cross-institute filters are rejected.
* Anonymous reporting is rejected.
* Existing Module 05A Daily Attendance remains functional.

---

# Verification Commands

Run:

`npm.cmd run lint`

`npx.cmd tsc --noEmit`

`npm.cmd run build`

`git diff --check`

Review:

`git status`

`git diff`

Do not commit or push until explicitly approved.

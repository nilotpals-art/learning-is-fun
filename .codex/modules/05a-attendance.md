# Module 05A – Daily Attendance

## Status

Planned

---

# Objective

Implement institute-scoped Daily Attendance for Learning Is Fun ERP.

Attendance must be recorded against the Student's **current academic assignment**, preserving historical accuracy even when a Student changes Batch later.

Attendance is an academic transaction and must never modify Student Master or Student Assignment history.

---

# Access

Administrator only.

Future versions may allow Teacher attendance entry based on assigned batches.

Students and Parents will have read-only attendance access in later modules.

---

# Attendance Flow

Administrator:

1. Select Attendance Date.
2. Select Academic Year.
3. Select Batch.
4. Load Students currently assigned to that Batch on the selected date.
5. Mark attendance.
6. Save once.

---

# Attendance Status

Approved values:

* Present
* Absent
* Late
* Leave

Store as controlled values.

Do not use arbitrary strings.

---

# Student Selection

Students must NOT be manually selected.

The system loads Students automatically from:

Current Student Assignment

matching:

* Academic Year
* Batch
* Effective From
* Effective To

The selected date must fall within the assignment period.

---

# Attendance Date

Required.

Cannot be empty.

Validation:

* valid date
* institute Academic Year validation
* attendance belongs to selected Academic Year

---

# Batch

Required.

Must belong to:

* institute
* Academic Year

Server-side validation required.

---

# Attendance Integrity

One Student can have only one attendance record per day.

Prevent duplicate attendance by database constraint.

---

# History

Attendance history must remain unchanged even if:

* Student changes Batch
* Student changes Class
* Student changes School

Attendance reflects where the Student belonged on that attendance date.

---

# Batch Changes

Example:

Batch A

01-Apr → 31-Aug

Batch B

01-Sep → NULL

Attendance:

15-Aug

must continue belonging to Batch A.

Attendance:

15-Sep

must use Batch B.

Student Assignment determines which Students are loaded.

---

# Attendance Entry Screen

Page:

Attendance

Header:

Daily Attendance

Subtitle:

Record daily attendance for students.

Theme:

Green.

---

# Summary Cards

Display:

* Total Students
* Present
* Absent
* Late
* Leave

Update live before save.

---

# Grid

Columns:

Admission No

Student

Attendance

Remarks (optional)

Attendance control:

Radio buttons or segmented control:

Present

Absent

Late

Leave

Default:

Present

---

# Remarks

Optional.

Short text only.

Uppercase normalization.

---

# Save

One Save button.

Attendance should be saved atomically.

If any row fails validation:

Rollback the batch.

---

# Duplicate Prevention

If attendance already exists:

Administrator should see:

Attendance already recorded.

Allow:

View

Edit Attendance

Do not silently overwrite.

---

# Edit Attendance

Administrator only.

Changes should update:

updated_at

History of edits can be introduced in a future audit module.

---

# Search

Search loaded Students by:

* Admission Number
* Student Name

---

# Filters

Required:

* Academic Year
* Date
* Batch

---

# Database

Before implementation inspect:

* attendance
* attendance_details
* student_attendance
* or any existing attendance tables.

Report:

* columns
* FKs
* indexes
* RLS
* existing data
* constraints

Reuse existing schema where appropriate.

Only propose migration if the existing model cannot support the approved design.

---

# Validation

Server-side validation:

* institute ownership
* Student
* Assignment
* Batch
* Academic Year
* duplicate attendance
* attendance date

Do not trust browser IDs.

---

# UI

Use the UI Design System.

Green module.

Large page header.

Summary cards.

Responsive table.

Mobile cards.

---

# Acceptance Criteria

Complete when:

* Administrator can record attendance.
* Students load automatically from current assignments.
* Duplicate attendance prevented.
* Batch changes preserve historical attendance.
* Search works.
* Filters work.
* Responsive layout works.
* Lint passes.
* TypeScript passes.
* Build passes.
* git diff --check passes.

Do not commit or push.

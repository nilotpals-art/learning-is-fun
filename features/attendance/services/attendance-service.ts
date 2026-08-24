import "server-only";

import type { AttendanceOptions, AttendanceRosterEntry, AttendanceStatus } from "@/features/attendance/types/attendance";
import type { AttendanceFilterValues, SaveAttendanceValues, UpdateAttendanceValues } from "@/features/attendance/validations/attendance-schema";
import { createClient } from "@/lib/supabase/server";

interface StudentRelation { name: string; admission_no: string }
interface ProfileRelation { name: string }
interface AssignmentRow {
  id: string;
  student_id: string;
  student: StudentRelation | StudentRelation[];
}
interface AttendanceRow {
  id: string;
  student_id: string;
  student_assignment_id: string;
  status: AttendanceStatus;
  remarks: string | null;
  updated_at: string;
  marked_by_profile: ProfileRelation | ProfileRelation[] | null;
}
interface AttendanceBatchRow {
  id: string;
  name: string;
  schedules: Array<{ day_of_week: number; is_active: boolean }> | null;
}

function one<T>(value: T | T[]): T { return Array.isArray(value) ? value[0] : value; }
function optionalOne<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function listAttendanceOptions(instituteId: string): Promise<AttendanceOptions> {
  const supabase = await createClient();
  const [years, batches] = await Promise.all([
    supabase.from("academic_years").select("id, name, start_date, end_date").eq("institute_id", instituteId).eq("is_active", true).order("start_date", { ascending: false }),
    supabase.from("batches").select("id, name, schedules:class_schedules!class_schedules_batch_fkey(day_of_week,is_active)").eq("institute_id", instituteId).eq("is_active", true).order("name"),
  ]);
  const error = years.error ?? batches.error;
  if (error) throw error;
  return {
    academicYears: (years.data ?? []).map((year) => ({ id: year.id, label: year.name, startDate: year.start_date, endDate: year.end_date })),
    batches: ((batches.data ?? []) as unknown as AttendanceBatchRow[]).map((batch) => ({
      id: batch.id,
      label: batch.name,
      weekdays: [...new Set((batch.schedules ?? []).filter((schedule) => schedule.is_active).map((schedule) => schedule.day_of_week))].sort((a, b) => a - b),
    })),
  };
}

export async function loadAttendanceRoster(instituteId: string, values: AttendanceFilterValues): Promise<AttendanceRosterEntry[]> {
  const supabase = await createClient();
  const [assignments, attendance, onBreak] = await Promise.all([
    supabase.from("student_assignments")
      .select("id, student_id, student:students!student_assignments_student_fkey(name, admission_no)")
      .eq("institute_id", instituteId).eq("academic_year_id", values.academicYearId).eq("batch_id", values.batchId)
      .lte("effective_from", values.attendanceDate).or(`effective_to.is.null,effective_to.gte.${values.attendanceDate}`),
    supabase.from("student_attendance")
      .select("id, student_id, student_assignment_id, status, remarks, updated_at, marked_by_profile:profiles!student_attendance_marked_by_institute_fkey(name)")
      .eq("institute_id", instituteId).eq("academic_year_id", values.academicYearId).eq("batch_id", values.batchId).eq("attendance_date", values.attendanceDate),
    supabase.rpc("get_on_break_assignments", {
      p_institute_id: instituteId,
      p_academic_year_id: values.academicYearId,
      p_batch_id: values.batchId,
      p_on_date: values.attendanceDate,
    }),
  ]);
  const error = assignments.error ?? attendance.error ?? onBreak.error;
  if (error) throw error;
  const breakAssignmentIds = new Set((onBreak.data as unknown as string[] | null) ?? []);
  const saved = new Map((attendance.data as unknown as AttendanceRow[]).map((row) => [row.student_assignment_id, row]));
  return (assignments.data as unknown as AssignmentRow[])
    .map((row) => {
      const student = one(row.student);
      const record = saved.get(row.id);
      const isOnBreak = breakAssignmentIds.has(row.id);
      return {
        assignmentId: row.id,
        studentId: row.student_id,
        admissionNumber: student.admission_no,
        studentName: student.name,
        attendanceId: record?.id ?? null,
        status: record?.status ?? (isOnBreak ? "Leave" : "Present"),
        remarks: record?.remarks ?? (isOnBreak ? "ON BREAK" : ""),
        markedByName: optionalOne(record?.marked_by_profile ?? null)?.name ?? null,
        updatedAt: record?.updated_at ?? null,
        onBreak: isOnBreak,
      };
    })
    .sort((a, b) => a.studentName.localeCompare(b.studentName));
}

export async function saveDailyAttendance(values: SaveAttendanceValues): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_daily_attendance", {
    p_attendance_date: values.attendanceDate,
    p_academic_year_id: values.academicYearId,
    p_batch_id: values.batchId,
    p_entries: values.entries,
  });
  if (error) throw error;
  return (data as { inserted_count: number }).inserted_count;
}

export async function updateStudentAttendance(values: UpdateAttendanceValues): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_student_attendance", {
    p_attendance_id: values.attendanceId,
    p_status: values.status,
    p_remarks: values.remarks,
  });
  if (error) throw error;
}

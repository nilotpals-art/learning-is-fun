import "server-only";

import type {
  AcademicYearAttendanceSummary,
  AttendanceHistoryCursor,
  AttendanceHistoryPage,
  AttendanceHistoryRow,
  AttendanceReportOptions,
  AttendanceReportResult,
  AttendanceStatusSummary,
  BatchAttendanceSummary,
  DailyAttendanceSummary,
  StudentAttendanceSummary,
} from "@/features/attendance-reports/types/attendance-report";
import type { AttendanceHistoryFilters, AttendanceReportFilters } from "@/features/attendance-reports/validations/attendance-report-schema";
import type { AttendanceStatus } from "@/features/attendance/types/attendance";
import { createClient } from "@/lib/supabase/server";

interface NameRelation { name: string }
interface ClassRelation { class_name: string }
interface StudentRelation { name: string; admission_no: string }
interface AssignmentRelation {
  academic_year: NameRelation | NameRelation[];
  batch: NameRelation | NameRelation[];
  board: NameRelation | NameRelation[];
  academic_class: ClassRelation | ClassRelation[];
}
interface HistoryRecord {
  id: string; attendance_date: string; student_id: string; student_assignment_id: string;
  status: AttendanceStatus; remarks: string | null; updated_at: string;
  student: StudentRelation | StudentRelation[];
  assignment: AssignmentRelation | AssignmentRelation[];
  marker: NameRelation | NameRelation[];
}

export class AttendanceReportError extends Error {}
function one<T>(value: T | T[]): T { return Array.isArray(value) ? value[0] : value; }
function encodeCursor(row: Pick<AttendanceHistoryRow, "attendanceDate" | "id">): string {
  return Buffer.from(JSON.stringify({ attendanceDate: row.attendanceDate, id: row.id }), "utf8").toString("base64url");
}
function decodeCursor(value: string | undefined): AttendanceHistoryCursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<AttendanceHistoryCursor>;
    if (!parsed.attendanceDate || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.attendanceDate) || !parsed.id || !/^[0-9a-f-]{36}$/i.test(parsed.id)) throw new Error();
    return { attendanceDate: parsed.attendanceDate, id: parsed.id };
  } catch { throw new AttendanceReportError("The pagination cursor is invalid. Reset the filters and try again."); }
}

export async function listAttendanceReportOptions(instituteId: string): Promise<AttendanceReportOptions> {
  const supabase = await createClient();
  const [years, batches, students] = await Promise.all([
    supabase.from("academic_years").select("id, name").eq("institute_id", instituteId).order("start_date", { ascending: false }),
    supabase.from("batches").select("id, name").eq("institute_id", instituteId).order("name"),
    supabase.from("students").select("id, name, admission_no").eq("institute_id", instituteId).order("name"),
  ]);
  const error = years.error ?? batches.error ?? students.error;
  if (error) throw error;
  return {
    academicYears: (years.data ?? []).map((x) => ({ id: x.id, label: x.name })),
    batches: (batches.data ?? []).map((x) => ({ id: x.id, label: x.name })),
    students: (students.data ?? []).map((x) => ({ id: x.id, label: `${x.name} (${x.admission_no})` })),
  };
}

async function validateOwnership(instituteId: string, filters: { academicYearId?: string; batchId?: string; studentId?: string }): Promise<void> {
  const supabase = await createClient();
  const checks = await Promise.all([
    filters.academicYearId ? supabase.from("academic_years").select("id").eq("id", filters.academicYearId).eq("institute_id", instituteId).maybeSingle() : null,
    filters.batchId ? supabase.from("batches").select("id").eq("id", filters.batchId).eq("institute_id", instituteId).maybeSingle() : null,
    filters.studentId ? supabase.from("students").select("id").eq("id", filters.studentId).eq("institute_id", instituteId).maybeSingle() : null,
  ]);
  if (checks.some((check) => check?.error)) throw new AttendanceReportError("We could not validate the selected report filters.");
  if ((filters.academicYearId && !checks[0]?.data) || (filters.batchId && !checks[1]?.data) || (filters.studentId && !checks[2]?.data)) {
    throw new AttendanceReportError("One or more selected filters are unavailable for your institute.");
  }
}

export async function listAttendanceHistory(instituteId: string, filters: AttendanceHistoryFilters): Promise<AttendanceHistoryPage> {
  await validateOwnership(instituteId, filters);
  const cursor = decodeCursor(filters.cursor);
  const supabase = await createClient();
  let studentIds: string[] | null = null;
  if (filters.search) {
    const escaped = filters.search.replaceAll(",", " ");
    const result = await supabase.from("students").select("id").eq("institute_id", instituteId)
      .or(`name.ilike.%${escaped}%,admission_no.ilike.%${escaped}%`).limit(5000);
    if (result.error) throw result.error;
    studentIds = (result.data ?? []).map((x) => x.id);
    if (studentIds.length === 0) return { rows: [], nextCursor: null, previousCursor: null };
  }

  let query = supabase.from("student_attendance").select(
    "id, attendance_date, student_id, student_assignment_id, status, remarks, updated_at, student:students!student_attendance_student_id_fkey(name, admission_no), assignment:student_assignments!student_attendance_assignment_fkey(academic_year:academic_years!student_assignments_academic_year_fkey(name), batch:batches!student_assignments_batch_compatibility_fkey(name), board:boards!student_assignments_board_fkey(name), academic_class:academic_classes!student_assignments_class_fkey(class_name)), marker:profiles!student_attendance_marked_by_institute_fkey(name)"
  ).eq("institute_id", instituteId);
  if (filters.dateFrom) query = query.gte("attendance_date", filters.dateFrom);
  if (filters.dateTo) query = query.lte("attendance_date", filters.dateTo);
  if (filters.academicYearId) query = query.eq("academic_year_id", filters.academicYearId);
  if (filters.batchId) query = query.eq("batch_id", filters.batchId);
  if (filters.studentId) query = query.eq("student_id", filters.studentId);
  if (filters.status) query = query.eq("status", filters.status);
  if (studentIds) query = query.in("student_id", studentIds);
  if (cursor) {
    const operator = filters.direction === "previous" ? "gt" : "lt";
    query = query.or(`attendance_date.${operator}.${cursor.attendanceDate},and(attendance_date.eq.${cursor.attendanceDate},id.${operator}.${cursor.id})`);
  }
  const ascending = filters.direction === "previous";
  const { data, error } = await query.order("attendance_date", { ascending }).order("id", { ascending }).limit(filters.pageSize + 1);
  if (error) throw error;
  const raw = data as unknown as HistoryRecord[];
  const hasExtra = raw.length > filters.pageSize;
  const pageRecords = raw.slice(0, filters.pageSize);
  if (ascending) pageRecords.reverse();
  const rows = pageRecords.map((record): AttendanceHistoryRow => {
    const student = one(record.student); const assignment = one(record.assignment);
    return { id: record.id, attendanceDate: record.attendance_date, studentId: record.student_id,
      assignmentId: record.student_assignment_id, admissionNumber: student.admission_no,
      studentName: student.name, academicYearName: one(assignment.academic_year).name,
      batchName: one(assignment.batch).name, boardName: one(assignment.board).name,
      className: one(assignment.academic_class).class_name, status: record.status,
      remarks: record.remarks ?? "", markedByName: one(record.marker).name, updatedAt: record.updated_at };
  });
  const first = rows[0]; const last = rows.at(-1);
  return {
    rows,
    previousCursor: first && (filters.direction === "next" ? Boolean(cursor) : hasExtra) ? encodeCursor(first) : null,
    nextCursor: last && (filters.direction === "previous" ? Boolean(cursor) : hasExtra) ? encodeCursor(last) : null,
  };
}

async function rpc<T>(name: string, parameters: Record<string, string | null>): Promise<T> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(name, parameters);
  if (error) throw error;
  return data as T;
}

export async function loadAttendanceReport(instituteId: string, filters: AttendanceReportFilters): Promise<AttendanceReportResult> {
  await validateOwnership(instituteId, filters);
  const common = { p_institute_id: instituteId, p_date_from: filters.dateFrom ?? null, p_date_to: filters.dateTo ?? null };
  switch (filters.report) {
    case "student":
      if (!filters.studentId || (!filters.academicYearId && !(filters.dateFrom && filters.dateTo))) throw new AttendanceReportError("Select a Student and an Academic Year or complete Date Range.");
      return { type: "student", data: await rpc<StudentAttendanceSummary>("student_attendance_summary", { ...common, p_student_id: filters.studentId, p_academic_year_id: filters.academicYearId ?? null }) };
    case "batch":
      if (!filters.batchId) throw new AttendanceReportError("Select a Batch.");
      return { type: "batch", data: await rpc<BatchAttendanceSummary>("batch_attendance_summary", { ...common, p_batch_id: filters.batchId, p_academic_year_id: filters.academicYearId ?? null }) };
    case "daily":
      if (!filters.attendanceDate || !filters.batchId) throw new AttendanceReportError("Select an Attendance Date and Batch.");
      return { type: "daily", data: await rpc<DailyAttendanceSummary>("daily_attendance_summary", { p_institute_id: instituteId, p_attendance_date: filters.attendanceDate, p_batch_id: filters.batchId }) };
    case "academic-year":
      if (!filters.academicYearId) throw new AttendanceReportError("Select an Academic Year.");
      return { type: "academic-year", data: await rpc<AcademicYearAttendanceSummary>("academic_year_attendance_summary", { ...common, p_academic_year_id: filters.academicYearId }) };
    case "status":
      if (!filters.status) throw new AttendanceReportError("Select an Attendance Status.");
      return { type: "status", data: await rpc<AttendanceStatusSummary>("attendance_status_summary", { ...common, p_status: filters.status }) };
  }
}

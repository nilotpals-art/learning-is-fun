import type { AttendanceStatus } from "@/features/attendance/types/attendance";

export interface ReportOption { id: string; label: string }
export interface AttendanceReportOptions {
  academicYears: ReportOption[];
  batches: ReportOption[];
  students: ReportOption[];
}

export interface AttendanceHistoryCursor { attendanceDate: string; id: string }
export interface AttendanceHistoryRow {
  id: string;
  attendanceDate: string;
  studentId: string;
  assignmentId: string;
  admissionNumber: string;
  studentName: string;
  academicYearName: string;
  batchName: string;
  boardName: string;
  className: string;
  status: AttendanceStatus;
  remarks: string;
  markedByName: string;
  updatedAt: string;
}
export interface AttendanceHistoryPage {
  rows: AttendanceHistoryRow[];
  nextCursor: string | null;
  previousCursor: string | null;
}

export interface AttendanceTotals {
  totalCount: number;
  presentCount: number;
  lateCount: number;
  effectivePresentCount: number;
  absentCount: number;
  leaveCount: number;
  attendancePercentage: number | null;
}
export interface StudentCalendarEntry { date: string; status: AttendanceStatus; remarks: string | null }
export interface StudentAttendanceSummary extends AttendanceTotals { calendar: StudentCalendarEntry[] }
export interface BatchStudentSummary extends AttendanceTotals { studentId: string; admissionNumber: string; studentName: string }
export interface BatchAttendanceSummary extends AttendanceTotals { students: number; rows: BatchStudentSummary[] }
export interface DailyAttendanceRow { admissionNumber: string; studentName: string; status: AttendanceStatus; remarks: string | null }
export interface DailyAttendanceSummary extends AttendanceTotals { rows: DailyAttendanceRow[] }
export interface AcademicYearBatchSummary extends AttendanceTotals { batchId: string; batchName: string }
export interface AcademicYearAttendanceSummary extends AttendanceTotals { batches: AcademicYearBatchSummary[] }
export interface AttendanceStatusSummary { status: AttendanceStatus; total: number; students: number; days: number }

export type AttendanceReportResult =
  | { type: "student"; data: StudentAttendanceSummary }
  | { type: "batch"; data: BatchAttendanceSummary }
  | { type: "daily"; data: DailyAttendanceSummary }
  | { type: "academic-year"; data: AcademicYearAttendanceSummary }
  | { type: "status"; data: AttendanceStatusSummary };

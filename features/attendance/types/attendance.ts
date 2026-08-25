export const ATTENDANCE_STATUSES = ["Present", "Absent", "Late", "Leave"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export interface AttendanceOption {
  id: string;
  label: string;
}

export interface AttendanceBatchOption extends AttendanceOption {
  weekdays: number[];
}

export interface AcademicYearAttendanceOption extends AttendanceOption {
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface AttendanceOptions {
  academicYears: AcademicYearAttendanceOption[];
  batches: AttendanceBatchOption[];
}

export interface AttendanceRosterEntry {
  assignmentId: string;
  studentId: string;
  admissionNumber: string;
  studentName: string;
  attendanceId: string | null;
  status: AttendanceStatus;
  remarks: string;
  markedByName: string | null;
  updatedAt: string | null;
  onBreak: boolean;
}

export type AttendanceRecordState = "new" | "recorded" | "inconsistent";

export type LoadAttendanceResult =
  | { status: "loaded"; recordState: AttendanceRecordState; entries: AttendanceRosterEntry[]; message?: string }
  | { status: "empty"; message: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string[] | undefined> };

export type AttendanceActionResult =
  | { status: "success"; message: string }
  | { status: "already_recorded"; message: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string[] | undefined> };

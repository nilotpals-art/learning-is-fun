export const PERMISSION = {
  ACADEMIC: "module.academic",
  STUDENTS: "module.students",
  ATTENDANCE: "module.attendance",
  PLANNER: "module.planner",
  PRACTICE: "module.practice",
  FEES: "module.fees",
} as const;

export type PermissionCode = (typeof PERMISSION)[keyof typeof PERMISSION];

export const STAFF_PERMISSION_OPTIONS: readonly { code: PermissionCode; label: string; description: string }[] = [
  { code: PERMISSION.ACADEMIC, label: "Academic Setup", description: "Academic years, boards, classes, subjects and batches" },
  { code: PERMISSION.STUDENTS, label: "Student Management", description: "Student master and academic assignments" },
  { code: PERMISSION.ATTENDANCE, label: "Attendance", description: "Daily attendance, history and reports" },
  { code: PERMISSION.PLANNER, label: "Learning Planner", description: "Calendar, schedules, results, holidays and notifications" },
  { code: PERMISSION.PRACTICE, label: "Practice Work", description: "Question papers, assignments and analytics" },
  { code: PERMISSION.FEES, label: "Fees", description: "Fee overview, collection, payments, reports and settings" },
];

export function permissionForPath(pathname: string): PermissionCode | null {
  if (pathname === "/dashboard") return null;
  if (pathname.startsWith("/masters/academic-years") || pathname.startsWith("/masters/school-boards") || pathname.startsWith("/masters/classes") || pathname.startsWith("/masters/subjects") || pathname.startsWith("/masters/batches")) return PERMISSION.ACADEMIC;
  if (pathname.startsWith("/students")) return PERMISSION.STUDENTS;
  if (pathname.startsWith("/attendance")) return PERMISSION.ATTENDANCE;
  if (pathname.startsWith("/learning-planner") || pathname.startsWith("/communication")) return PERMISSION.PLANNER;
  if (pathname.startsWith("/practice-work")) return PERMISSION.PRACTICE;
  if (pathname.startsWith("/fees") || pathname.startsWith("/masters/fee-heads") || pathname.startsWith("/masters/payment-modes")) return PERMISSION.FEES;
  return null;
}

import { redirect } from "next/navigation";

import { AttendanceReportsManager } from "@/features/attendance-reports/components/attendance-reports-manager";
import { AttendanceReportError, listAttendanceReportOptions, loadAttendanceReport } from "@/features/attendance-reports/services/attendance-report-service";
import type { AttendanceReportResult } from "@/features/attendance-reports/types/attendance-report";
import { attendanceReportFilterSchema } from "@/features/attendance-reports/validations/attendance-report-schema";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

type SearchParams = Record<string, string | string[] | undefined>;
function scalar(params: SearchParams): Record<string, string | undefined> { return Object.fromEntries(Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])); }
function ready(filters: ReturnType<typeof attendanceReportFilterSchema.parse>): boolean { switch (filters.report) { case "student": return Boolean(filters.studentId && (filters.academicYearId || (filters.dateFrom && filters.dateTo))); case "batch": return Boolean(filters.batchId); case "daily": return Boolean(filters.attendanceDate && filters.batchId); case "academic-year": return Boolean(filters.academicYearId); case "status": return Boolean(filters.status); } }

export default async function AttendanceReportsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const profile = await requireRole(DASHBOARD_ROLES); if (!profile.instituteId) redirect("/unauthorized");
  const [params, options] = await Promise.all([searchParams, listAttendanceReportOptions(profile.instituteId)]);
  const parsed = attendanceReportFilterSchema.safeParse(scalar(params)); const fallback = attendanceReportFilterSchema.parse({});
  let result: AttendanceReportResult | null = null; let error: string | null = parsed.success ? null : parsed.error.issues[0]?.message ?? "Invalid Attendance Report filters.";
  if (parsed.success && ready(parsed.data)) { try { result = await loadAttendanceReport(profile.instituteId, parsed.data); } catch (cause) { error = cause instanceof AttendanceReportError ? cause.message : "We could not generate the Attendance report. Please try again."; } }
  return <AttendanceReportsManager options={options} filters={parsed.success ? parsed.data : fallback} result={result} error={error} />;
}

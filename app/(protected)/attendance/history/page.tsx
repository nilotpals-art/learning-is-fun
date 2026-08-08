import { redirect } from "next/navigation";

import { AttendanceHistoryManager } from "@/features/attendance-reports/components/attendance-history-manager";
import { AttendanceReportError, listAttendanceHistory, listAttendanceReportOptions } from "@/features/attendance-reports/services/attendance-report-service";
import type { AttendanceHistoryPage } from "@/features/attendance-reports/types/attendance-report";
import { attendanceHistoryFilterSchema } from "@/features/attendance-reports/validations/attendance-report-schema";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

type SearchParams = Record<string, string | string[] | undefined>;
function scalar(params: SearchParams): Record<string, string | undefined> { return Object.fromEntries(Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])); }

export default async function AttendanceHistoryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const profile = await requireRole(DASHBOARD_ROLES); if (!profile.instituteId) redirect("/unauthorized");
  const [params, options] = await Promise.all([searchParams, listAttendanceReportOptions(profile.instituteId)]);
  const parsed = attendanceHistoryFilterSchema.safeParse(scalar(params));
  const fallback = attendanceHistoryFilterSchema.parse({});
  let page: AttendanceHistoryPage = { rows: [], nextCursor: null, previousCursor: null };
  let error: string | null = parsed.success ? null : parsed.error.issues[0]?.message ?? "Invalid Attendance History filters.";
  if (parsed.success) { try { page = await listAttendanceHistory(profile.instituteId, parsed.data); } catch (cause) { error = cause instanceof AttendanceReportError ? cause.message : "We could not load Attendance History. Please try again."; } }
  return <AttendanceHistoryManager options={options} page={page} filters={parsed.success ? parsed.data : fallback} error={error} />;
}

import { redirect } from "next/navigation";

import { AttendanceManager } from "@/features/attendance/components/attendance-manager";
import { listAttendanceOptions } from "@/features/attendance/services/attendance-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function AttendancePage() {
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) redirect("/unauthorized");
  const options = await listAttendanceOptions(profile.instituteId);
  return <AttendanceManager options={options} />;
}

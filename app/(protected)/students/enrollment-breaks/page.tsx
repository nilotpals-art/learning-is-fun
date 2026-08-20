import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { CalendarOff } from "lucide-react";
import { EnrollmentBreaksManager } from "@/features/rollover/components/enrollment-breaks-manager";
import { listAdminEnrollmentBreaks, listBreakFormOptions } from "@/features/rollover/services/rollover-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function EnrollmentBreaksPage() {
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) redirect("/unauthorized");
  const [breaks, options] = await Promise.all([
    listAdminEnrollmentBreaks(profile),
    listBreakFormOptions(profile.instituteId),
  ]);
  return <div className="space-y-6"><PageHeader title="Enrollment Breaks" description="Record and manage scheduled student absences with fee treatment preparation." icon={CalendarOff} theme="students" /><EnrollmentBreaksManager breaks={breaks} options={options} /></div>;
}
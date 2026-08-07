import { redirect } from "next/navigation";

import { AcademicYearsManager } from "@/features/academic-years/components/academic-years-manager";
import { listAcademicYears } from "@/features/academic-years/services/academic-year-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function AcademicYearsPage() {
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) redirect("/unauthorized");
  const years = await listAcademicYears(profile.instituteId);
  return <AcademicYearsManager years={years} />;
}

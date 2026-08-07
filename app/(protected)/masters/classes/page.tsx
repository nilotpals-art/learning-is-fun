import { redirect } from "next/navigation";

import { ClassesManager } from "@/features/classes/components/classes-manager";
import { listAcademicClasses } from "@/features/classes/services/class-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function ClassesPage() {
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) redirect("/unauthorized");

  const classes = await listAcademicClasses(profile.instituteId);
  return <ClassesManager classes={classes} />;
}

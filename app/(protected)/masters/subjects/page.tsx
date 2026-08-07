import { redirect } from "next/navigation";

import { SubjectsManager } from "@/features/subjects/components/subjects-manager";
import { listSubjects } from "@/features/subjects/services/subject-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function SubjectsPage() {
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) redirect("/unauthorized");

  const subjects = await listSubjects(profile.instituteId);
  return <SubjectsManager subjects={subjects} />;
}

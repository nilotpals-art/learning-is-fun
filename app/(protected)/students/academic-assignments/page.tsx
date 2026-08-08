import { redirect } from "next/navigation";

import { StudentAcademicAssignmentsManager } from "@/features/student-academic-assignments/components/student-academic-assignments-manager";
import { listAssignmentOptions, listStudentAssignments } from "@/features/student-academic-assignments/services/student-academic-assignment-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function StudentAcademicAssignmentsPage({ searchParams }: { searchParams: Promise<{ student?: string }> }) {
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) redirect("/unauthorized");
  const [assignments, options, params] = await Promise.all([listStudentAssignments(profile.instituteId), listAssignmentOptions(profile.instituteId), searchParams]);
  const initialStudentId = options.students.some((x) => x.id === params.student) ? params.student : undefined;
  return <StudentAcademicAssignmentsManager assignments={assignments} options={options} initialStudentId={initialStudentId} />;
}

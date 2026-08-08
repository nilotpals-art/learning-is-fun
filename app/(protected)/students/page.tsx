import { redirect } from "next/navigation";

import { StudentsManager } from "@/features/students/components/students-manager";
import { listStudentAssignments } from "@/features/student-academic-assignments/services/student-academic-assignment-service";
import { listActiveAcademicYears, listStudents } from "@/features/students/services/student-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function StudentsPage() {
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) redirect("/unauthorized");
  const [students, academicYears, assignments] = await Promise.all([
    listStudents(profile.instituteId),
    listActiveAcademicYears(profile.instituteId),
    listStudentAssignments(profile.instituteId),
  ]);
  return <StudentsManager students={students} academicYears={academicYears} assignments={assignments} />;
}

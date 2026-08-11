import { redirect } from "next/navigation";

import { StudentsManager } from "@/features/students/components/students-manager";
import { listStudentAssignments } from "@/features/student-academic-assignments/services/student-academic-assignment-service";
import { listActiveAcademicYears, listStudents } from "@/features/students/services/student-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";
import { getFeeStructureOptions } from "@/features/fees/services/fee-structure-service";

export default async function StudentsPage() {
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) redirect("/unauthorized");
  const [students, academicYears, assignments, feeOptions] = await Promise.all([
    listStudents(profile.instituteId),
    listActiveAcademicYears(profile.instituteId),
    listStudentAssignments(profile.instituteId),
    getFeeStructureOptions(profile),
  ]);
  return <StudentsManager students={students} academicYears={academicYears} classes={feeOptions.classes} assignments={assignments} />;
}

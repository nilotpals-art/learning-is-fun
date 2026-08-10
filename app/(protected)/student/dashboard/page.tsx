import { StudentDashboard } from "@/features/student-dashboard/components/student-dashboard";
import { getStudentDashboardData } from "@/features/student-dashboard/services/student-dashboard-service";
import { requireRole } from "@/lib/auth/services/auth-service";

export default async function StudentDashboardPage() {
  const profile = await requireRole(["Student"]);
  return <StudentDashboard data={await getStudentDashboardData(profile)} />;
}

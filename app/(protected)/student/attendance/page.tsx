import { Card, CardContent } from "@/components/ui/card";
import { StudentPageShell } from "@/features/student-dashboard/components/student-page-shell";
import { getStudentAttendance } from "@/features/student-dashboard/services/student-dashboard-service";
import { requireRole } from "@/lib/auth/services/auth-service";

export default async function StudentAttendancePage() {
  const profile = await requireRole(["Student"]);
  const attendance = await getStudentAttendance(profile);
  return <StudentPageShell title="My Attendance" description="Your institute-recorded attendance using Present and Late as Effective Present."><Card><CardContent className="p-6">{attendance ? <><p className="text-sm text-muted-foreground">Attendance percentage</p><p className="mt-1 text-4xl font-bold">{attendance.attendancePercentage?.toFixed(1)}%</p><dl className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">{[["Present", attendance.presentCount], ["Late", attendance.lateCount], ["Effective Present", attendance.effectivePresentCount], ["Absent", attendance.absentCount], ["Leave", attendance.leaveCount], ["Total", attendance.totalCount]].map(([name, value]) => <div key={name} className="rounded-2xl bg-muted/40 p-4"><dt className="text-xs text-muted-foreground">{name}</dt><dd className="mt-1 text-2xl font-bold">{value}</dd></div>)}</dl></> : <p className="py-8 text-center text-muted-foreground">Attendance will appear after your first recorded class.</p>}</CardContent></Card></StudentPageShell>;
}

import { PageHeader } from "@/components/layout/page-header";
import { ParentScheduleView } from "@/features/parent/components/parent-portal";
import { getParentChildren, getUpcomingScheduleEvents } from "@/features/parent/services/parent-service";
import { requireRole } from "@/lib/auth/services/auth-service";

export default async function Page() {
  const profile = await requireRole(["Parent"]);
  const linkedChildren = await getParentChildren(profile);
  const scheduleByStudent: Record<string, Awaited<ReturnType<typeof getUpcomingScheduleEvents>>> = {};
  for (const child of linkedChildren) scheduleByStudent[child.studentId] = await getUpcomingScheduleEvents(profile, child.studentId, 30);
  return <div className="space-y-6"><PageHeader title="Schedule" description="Upcoming classes and events for your linked children." /><ParentScheduleView linkedChildren={linkedChildren} scheduleByStudent={scheduleByStudent} /></div>;
}

import { redirect } from "next/navigation";
import { PlannerShell } from "@/features/learning-planner/components/planner-shell";
import { ScheduleManager } from "@/features/learning-planner/components/schedule-manager";
import { listClassSchedules } from "@/features/learning-planner/services/schedule-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";
export default async function SchedulesPage(){const profile=await requireRole(DASHBOARD_ROLES);if(!profile.instituteId)redirect("/unauthorized");const schedules=await listClassSchedules(profile);return <PlannerShell title="Recurring Schedules" description="Audit Batch-owned weekly timetables. Routine classes are projected into the Calendar without creating event rows."><ScheduleManager schedules={schedules}/></PlannerShell>}

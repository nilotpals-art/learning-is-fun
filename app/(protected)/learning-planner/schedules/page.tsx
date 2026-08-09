import { redirect } from "next/navigation";
import { PlannerShell } from "@/features/learning-planner/components/planner-shell";
import { ScheduleManager } from "@/features/learning-planner/components/schedule-manager";
import { ScheduleGenerationDialog } from "@/features/learning-planner/components/schedule-generation-dialog";
import { listClassSchedules,listPlannerOptions } from "@/features/learning-planner/services/schedule-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";
export default async function SchedulesPage(){const profile=await requireRole(DASHBOARD_ROLES);if(!profile.instituteId)redirect("/unauthorized");const [schedules,options]=await Promise.all([listClassSchedules(profile),listPlannerOptions(profile)]);return <PlannerShell title="Class Schedules" description="Maintain effective-dated weekly schedules for each Batch."><div className="mb-6 flex justify-end"><ScheduleGenerationDialog batches={options.batches} schedules={schedules.filter((schedule) => schedule.isActive)}/></div><ScheduleManager schedules={schedules} options={options}/></PlannerShell>}

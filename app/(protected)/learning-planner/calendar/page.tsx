import { redirect } from "next/navigation";
import { CalendarEventManager } from "@/features/learning-planner/components/calendar-event-manager";
import { PlannerShell } from "@/features/learning-planner/components/planner-shell";
import { listScheduleEvents } from "@/features/learning-planner/services/event-service";
import { getHolidayCalendar } from "@/features/learning-planner/services/holiday-service";
import { listPlannerOptions } from "@/features/learning-planner/services/schedule-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function CalendarPage(){const profile=await requireRole(DASHBOARD_ROLES);if(!profile.instituteId)redirect("/unauthorized");const year=new Date().getFullYear();const [events,options,holidayData]=await Promise.all([listScheduleEvents(profile),listPlannerOptions(profile),getHolidayCalendar(profile,`${year}-01-01`,`${year}-12-31`)]);return <PlannerShell title="Academic Calendar" description="Browse dated classes, tests, meetings, holidays, and special events."><CalendarEventManager events={events} options={options} holidays={holidayData.holidays} providerAvailable={holidayData.providerAvailable}/></PlannerShell>}

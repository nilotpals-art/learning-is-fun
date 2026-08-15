import { redirect } from "next/navigation";
import { CalendarEventManager } from "@/features/learning-planner/components/calendar-event-manager";
import { PlannerShell } from "@/features/learning-planner/components/planner-shell";
import { listCalendarReadModel } from "@/features/learning-planner/services/calendar-projection-service";
import { getHolidayCalendar } from "@/features/learning-planner/services/holiday-service";
import { listPlannerOptions } from "@/features/learning-planner/services/schedule-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function CalendarPage(){const profile=await requireRole(DASHBOARD_ROLES);if(!profile.instituteId)redirect("/unauthorized");const year=new Date().getFullYear();const fromDate=`${year}-01-01`;const toDate=`${year}-12-31`;const [events,options,holidayData]=await Promise.all([listCalendarReadModel(profile,fromDate,toDate),listPlannerOptions(profile),getHolidayCalendar(profile,fromDate,toDate)]);return <PlannerShell title="Academic Calendar" description="Browse the recurring timetable alongside persisted exceptions, tests, meetings, and holidays."><CalendarEventManager events={events} options={options} holidays={holidayData.holidays} providerAvailable={holidayData.providerAvailable}/></PlannerShell>}

import { redirect } from "next/navigation";
import { HolidaySettingsManager } from "@/features/learning-planner/components/holiday-settings-manager";
import { PlannerShell } from "@/features/learning-planner/components/planner-shell";
import { getHolidayCalendar, getHolidaySettings } from "@/features/learning-planner/services/holiday-service";
import { listPlannerOptions } from "@/features/learning-planner/services/schedule-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function HolidaysPage(){const profile=await requireRole(DASHBOARD_ROLES);if(!profile.instituteId)redirect("/unauthorized");const year=new Date().getFullYear();const[settings,calendar,options]=await Promise.all([getHolidaySettings(profile),getHolidayCalendar(profile,`${year}-01-01`,`${year}-12-31`),listPlannerOptions(profile)]);return <PlannerShell title="Holiday Settings" description="Preview India holidays and explicitly decide which imported dates are non-working."><HolidaySettingsManager settings={settings} holidays={calendar.holidays} branches={options.branches} providerAvailable={calendar.providerAvailable}/></PlannerShell>}

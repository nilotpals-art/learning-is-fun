"use server";

import { revalidatePath } from "next/cache";
import { holidayImportSchema, holidayObservationSchema, holidaySettingsSchema } from "@/features/learning-planner/schemas/holiday-schema";
import { importPublicHoliday, saveHolidaySettings, setPublicHolidayObservation } from "@/features/learning-planner/services/holiday-service";
import type { PlannerActionResult } from "@/features/learning-planner/types/learning-planner";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

function refresh():void{["/learning-planner","/learning-planner/calendar","/learning-planner/holidays","/student/dashboard","/student/schedule"].forEach(path=>revalidatePath(path));}
export async function saveHolidaySettingsAction(input:unknown):Promise<PlannerActionResult>{const parsed=holidaySettingsSchema.safeParse(input);if(!parsed.success)return{status:"error",message:"Select valid holiday settings.",fieldErrors:parsed.error.flatten().fieldErrors};const profile=await requireRole(DASHBOARD_ROLES);try{await saveHolidaySettings(profile,{countryCode:"IN",...parsed.data});refresh();return{status:"success",message:"Holiday settings saved."};}catch{return{status:"error",message:"Holiday settings could not be saved."};}}
export async function importPublicHolidayAction(input:unknown):Promise<PlannerActionResult>{const parsed=holidayImportSchema.safeParse(input);if(!parsed.success)return{status:"error",message:"This public holiday could not be imported.",fieldErrors:parsed.error.flatten().fieldErrors};const profile=await requireRole(DASHBOARD_ROLES);try{await importPublicHoliday(profile,parsed.data);refresh();return{status:"success",message:parsed.data.observedAsHoliday?"Holiday imported as a non-working day.":"Working-day override saved."};}catch{return{status:"error",message:"This public holiday could not be imported."};}}
export async function setPublicHolidayObservationAction(input:unknown):Promise<PlannerActionResult>{const parsed=holidayObservationSchema.safeParse(input);if(!parsed.success)return{status:"error",message:"Invalid holiday selection."};const profile=await requireRole(DASHBOARD_ROLES);try{await setPublicHolidayObservation(profile,parsed.data.id,parsed.data.observedAsHoliday);refresh();return{status:"success",message:parsed.data.observedAsHoliday?"This date is now non-working.":"Working-day override saved. Classes may be generated."};}catch{return{status:"error",message:"The holiday policy could not be updated."};}}

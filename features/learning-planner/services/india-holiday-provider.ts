import "server-only";
import { requestIndiaHolidays } from "@/features/learning-planner/services/india-holiday-provider-core";
export type { ProviderHoliday } from "@/features/learning-planner/services/india-holiday-provider-core";
export async function fetchIndiaHolidays(year:number,stateCode:string|null){return requestIndiaHolidays(year,stateCode,fetch);}

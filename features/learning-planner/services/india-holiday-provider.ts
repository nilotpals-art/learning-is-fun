import "server-only";

import { requestIndiaHolidays } from "@/features/learning-planner/services/india-holiday-provider-core";
import { getWestBengalHolidays } from "@/features/learning-planner/services/west-bengal-holiday-provider";
export type { ProviderHoliday } from "@/features/learning-planner/services/india-holiday-provider-core";

export async function fetchIndiaHolidays(year:number,stateCode:string|null){
  if(stateCode==="IN-WB"){
    const westBengal=getWestBengalHolidays(year);
    if(westBengal)return westBengal;
  }
  return requestIndiaHolidays(year,stateCode,fetch);
}

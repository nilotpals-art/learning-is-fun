import type { HolidayScope } from "@/features/learning-planner/types/learning-planner";

export const INDIA_HOLIDAY_PROVIDER = "INDIA_POST";
export interface ProviderHoliday { externalId:string;provider:string;name:string;date:string;scope:Extract<HolidayScope,"national"|"state">;subdivisionCode:string|null }
interface IndiaPostHoliday { name:string;date:string;day:string }

const STATE_CIRCLES:Record<string,string>={"IN-AN":"West Bengal Circle","IN-AP":"Andhra Pradesh Circle","IN-AR":"North East Circle","IN-AS":"Assam Circle","IN-BR":"Bihar Circle","IN-CH":"Punjab Circle","IN-CT":"Chhattisgarh Circle","IN-DL":"Delhi Circle","IN-GA":"Maharashtra Circle","IN-GJ":"Gujarat Circle","IN-HR":"Haryana Circle","IN-HP":"Himachal Pradesh Circle","IN-JH":"Jharkhand Circle","IN-KA":"Karnataka Circle","IN-KL":"Kerala Circle","IN-LA":"Jammu & Kashmir Circle","IN-MP":"Madhya Pradesh Circle","IN-MH":"Maharashtra Circle","IN-MN":"North East Circle","IN-ML":"North East Circle","IN-MZ":"North East Circle","IN-NL":"North East Circle","IN-OD":"Odisha Circle","IN-PY":"Tamil Nadu Circle","IN-PB":"Punjab Circle","IN-RJ":"Rajasthan Circle","IN-TN":"Tamil Nadu Circle","IN-TG":"Telangana Circle","IN-TR":"North East Circle","IN-UP":"Uttar Pradesh Circle","IN-UT":"Uttarakhand Circle","IN-WB":"West Bengal Circle"};
const STATE_NAMES:Record<string,string>={"IN-AN":"Andaman and Nicobar Islands","IN-AP":"Andhra Pradesh","IN-AR":"Arunachal Pradesh","IN-AS":"Assam","IN-BR":"Bihar","IN-CH":"Chandigarh","IN-CT":"Chhattisgarh","IN-DL":"Delhi","IN-GA":"Goa","IN-GJ":"Gujarat","IN-HR":"Haryana","IN-HP":"Himachal Pradesh","IN-JH":"Jharkhand","IN-KA":"Karnataka","IN-KL":"Kerala","IN-LA":"Ladakh","IN-MP":"Madhya Pradesh","IN-MH":"Maharashtra","IN-MN":"Manipur","IN-ML":"Meghalaya","IN-MZ":"Mizoram","IN-NL":"Nagaland","IN-OD":"Odisha","IN-PY":"Puducherry","IN-PB":"Punjab","IN-RJ":"Rajasthan","IN-TN":"Tamil Nadu","IN-TG":"Telangana","IN-TR":"Tripura","IN-UP":"Uttar Pradesh","IN-UT":"Uttarakhand","IN-WB":"West Bengal"};
const MONTHS:Record<string,string>={January:"01",February:"02",March:"03",April:"04",May:"05",June:"06",July:"07",August:"08",September:"09",October:"10",November:"11",December:"12"};

function extractArray(source:string,key:string):unknown[]{
  const escaped=key.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const match=new RegExp(`"${escaped}"\\s*:\\s*\\[`).exec(source);
  if(!match||match.index===undefined)return[];
  const from=match.index+match[0].length-1;
  let depth=0;let quoted=false;let escapedChar=false;
  for(let index=from;index<source.length;index++){
    const char=source[index];
    if(escapedChar){escapedChar=false;continue;}
    if(char==="\\"){escapedChar=true;continue;}
    if(char==='"')quoted=!quoted;
    if(quoted)continue;
    if(char==='[')depth++;
    if(char===']'&&--depth===0){try{return JSON.parse(source.slice(from,index+1)) as unknown[];}catch{return[];}}
  }
  return[];
}

function dateValue(value:string):string|null{const match=/^(\d{2})-([A-Za-z]+)-(\d{4})$/.exec(value);if(!match||!MONTHS[match[2]])return null;return `${match[3]}-${MONTHS[match[2]]}-${match[1]}`;}
function stateKeys(stateCode:string|null):string[]{if(!stateCode)return[];const circle=STATE_CIRCLES[stateCode];const state=STATE_NAMES[stateCode];return [...new Set([circle,circle?.replace(/\s+Circle$/i,""),state].filter((value):value is string=>Boolean(value)))];}

export function normalizeIndiaPostHolidays(html:string,stateCode:string|null):ProviderHoliday[]{
  const source=html.replaceAll('\\"','"').replaceAll("\\'", "'");
  const groups:[unknown[],"national"|"state",string|null][]=[[extractArray(source,"All India"),"national",null]];
  for(const key of stateKeys(stateCode)){
    const rows=extractArray(source,key);
    if(rows.length){groups.push([rows,"state",stateCode]);break;}
  }
  const unique=new Map<string,ProviderHoliday>();
  groups.forEach(([rows,scope,subdivisionCode])=>rows.forEach(value=>{
    const row=value as Partial<IndiaPostHoliday>;
    if(typeof row.name!=="string"||typeof row.date!=="string")return;
    const date=dateValue(row.date);
    const name=row.name.trim().replace(/\s+/g," ").toUpperCase();
    if(!date||!name)return;
    const key=`${date}:${name}:${scope}`;
    if(unique.has(key))return;
    unique.set(key,{externalId:`${date}:${scope}:${subdivisionCode??"IN"}:${name}`,provider:INDIA_HOLIDAY_PROVIDER,name,date,scope,subdivisionCode});
  }));
  return[...unique.values()].sort((left,right)=>left.date.localeCompare(right.date)||left.name.localeCompare(right.name));
}

export async function requestIndiaHolidays(year:number,stateCode:string|null,fetcher:typeof fetch):Promise<ProviderHoliday[]>{
  if(!Number.isInteger(year)||year<2000||year>2100)return[];
  const options={signal:AbortSignal.timeout(8_000),next:{revalidate:86_400},headers:{Accept:"text/html"}};
  const response=await fetcher(`https://www.indiapost.gov.in/holidays-list?year=${year}`,options);
  if(!response.ok)throw new Error(`HOLIDAY_PROVIDER_${response.status}`);
  const page=await response.text();
  const pageHolidays=normalizeIndiaPostHolidays(page,stateCode);
  const path=/src="([^"]*holidays-list\/page-[^"]+\.js)"/.exec(page)?.[1];
  if(!path){if(pageHolidays.length)return pageHolidays;throw new Error("HOLIDAY_PROVIDER_INVALID_RESPONSE");}
  const bundleResponse=await fetcher(new URL(path,"https://www.indiapost.gov.in").toString(),options);
  if(!bundleResponse.ok){if(pageHolidays.length)return pageHolidays;throw new Error(`HOLIDAY_PROVIDER_${bundleResponse.status}`);}
  const bundleHolidays=normalizeIndiaPostHolidays(await bundleResponse.text(),stateCode);
  const merged=new Map<string,ProviderHoliday>();
  for(const holiday of [...pageHolidays,...bundleHolidays])merged.set(`${holiday.date}:${holiday.name}:${holiday.scope}`,holiday);
  const holidays=[...merged.values()].sort((left,right)=>left.date.localeCompare(right.date)||left.name.localeCompare(right.name));
  if(!holidays.length)throw new Error("HOLIDAY_PROVIDER_INVALID_RESPONSE");
  return holidays;
}

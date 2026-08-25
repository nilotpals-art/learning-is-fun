"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { importPublicHolidayAction, saveHolidaySettingsAction, setPublicHolidayObservationAction } from "@/features/learning-planner/actions/holiday-actions";
import type { HolidaySettings, PlannerOption, PublicHoliday } from "@/features/learning-planner/types/learning-planner";

const STATES=[["IN-AN","Andaman and Nicobar Islands"],["IN-AP","Andhra Pradesh"],["IN-AR","Arunachal Pradesh"],["IN-AS","Assam"],["IN-BR","Bihar"],["IN-CH","Chandigarh"],["IN-CT","Chhattisgarh"],["IN-DL","Delhi"],["IN-GA","Goa"],["IN-GJ","Gujarat"],["IN-HR","Haryana"],["IN-HP","Himachal Pradesh"],["IN-JH","Jharkhand"],["IN-KA","Karnataka"],["IN-KL","Kerala"],["IN-LA","Ladakh"],["IN-MP","Madhya Pradesh"],["IN-MH","Maharashtra"],["IN-MN","Manipur"],["IN-ML","Meghalaya"],["IN-MZ","Mizoram"],["IN-NL","Nagaland"],["IN-OD","Odisha"],["IN-PY","Puducherry"],["IN-PB","Punjab"],["IN-RJ","Rajasthan"],["IN-TN","Tamil Nadu"],["IN-TG","Telangana"],["IN-TR","Tripura"],["IN-UP","Uttar Pradesh"],["IN-UT","Uttarakhand"],["IN-WB","West Bengal"]] as const;

export function HolidaySettingsManager({settings,holidays,branches,providerAvailable}:{settings:HolidaySettings;holidays:PublicHoliday[];branches:PlannerOption[];providerAvailable:boolean}){
  const router=useRouter();
  const[pending,start]=useTransition();
  const[feedback,setFeedback]=useState<string|null>(null);
  const[branchId,setBranchId]=useState("");
  const[stateCode,setStateCode]=useState(settings.stateCode??"IN-WB");
  const[showNational,setShowNational]=useState(settings.showNationalHolidays);
  const[showState,setShowState]=useState(settings.showStateHolidays);
  const[portalThemeEnabled,setPortalThemeEnabled]=useState(settings.portalThemeEnabled);
  const westBengal=stateCode==="IN-WB";
  const run=(operation:()=>Promise<{status:"success"|"error";message:string}>)=>start(async()=>{const result=await operation();setFeedback(result.message);if(result.status==="success")router.refresh();});
  const importHoliday=(holiday:PublicHoliday,observedAsHoliday:boolean)=>run(()=>importPublicHolidayAction({externalId:holiday.externalId,provider:holiday.provider,name:holiday.name,date:holiday.date,scope:holiday.scope,subdivisionCode:holiday.subdivisionCode??undefined,branchId:branchId||undefined,observedAsHoliday}));

  return <div className="space-y-6">
    <Card><CardHeader><CardTitle>India Holiday Settings</CardTitle></CardHeader><CardContent className="space-y-4">
      {westBengal?<p className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">West Bengal uses one combined State holiday list. It already includes national holidays such as Republic Day and Independence Day, so the separate India national list is hidden to prevent duplicates.</p>:null}
      <form action={()=>run(()=>saveHolidaySettingsAction({stateCode,showNationalHolidays:westBengal?false:showNational,showStateHolidays:showState,portalThemeEnabled}))} className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium">Country<select disabled className="mt-1 h-10 w-full rounded-xl border bg-muted px-3"><option>India (IN)</option></select></label>
        <label className="text-sm font-medium">State / Union Territory<select value={stateCode} onChange={event=>{const value=event.target.value;setStateCode(value);if(value)setShowState(true);if(value==="IN-WB")setShowNational(false);}} className="mt-1 h-10 w-full rounded-xl border bg-card px-3"><option value="">Select State / UT</option>{STATES.map(([code,name])=><option key={code} value={code}>{name}</option>)}</select></label>
        {!westBengal?<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showNational} onChange={event=>setShowNational(event.target.checked)}/>Show India national holidays</label>:<div className="rounded-xl border bg-muted/40 p-3 text-sm text-muted-foreground">India national holidays are already included in the West Bengal list.</div>}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showState} disabled={!stateCode} onChange={event=>setShowState(event.target.checked)}/>Show State/UT holidays</label>
        <label className="md:col-span-2 flex items-start gap-3 rounded-xl border bg-card p-4 text-sm"><input className="mt-1" type="checkbox" checked={portalThemeEnabled} onChange={event=>setPortalThemeEnabled(event.target.checked)}/><span><strong className="block">Use holiday theme in Student and Parent portals</strong><span className="text-muted-foreground">When off, holidays remain in the planner but the portal keeps its normal design.</span></span></label>
        <div className="md:col-span-2"><Button disabled={pending || !stateCode}>Save Settings</Button></div>
      </form>
    </CardContent></Card>
    {branches.length?<Card><CardContent className="p-4"><label className="text-sm font-medium">Import scope<select value={branchId} onChange={event=>setBranchId(event.target.value)} className="mt-1 h-10 w-full rounded-xl border bg-card px-3 sm:max-w-md"><option value="">Institute-wide</option>{branches.map(branch=><option key={branch.id} value={branch.id}>{branch.label}</option>)}</select></label></CardContent></Card>:null}
    {!providerAvailable?<p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Public holiday preview is temporarily unavailable. Imported holidays and schedule generation are unaffected.</p>:null}
    <div className="space-y-3"><h2 className="text-xl font-semibold">Holiday Preview and Policy</h2>{holidays.length===0?<Card><CardContent className="p-8 text-center text-muted-foreground">{stateCode?"No public holidays are available for this year and configuration.":"Select and save your State / UT above to load local holidays."}</CardContent></Card>:holidays.map(holiday=><Card key={holiday.id}><CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap gap-2"><strong>{holiday.name}</strong><Badge variant="outline">{holiday.scope==="national"?"India Holiday":"State Holiday"}</Badge>{holiday.scope==="state"&&holiday.subdivisionCode==="IN-WB"?<Badge variant="secondary">West Bengal</Badge>:null}{holiday.source==="external"?<Badge variant="secondary">Display only</Badge>:holiday.observedAsHoliday?<Badge>Non-working</Badge>:<Badge variant="outline">Classes held</Badge>}</div><p className="mt-1 text-sm text-muted-foreground">{holiday.date}{holiday.subdivisionCode?` · ${holiday.subdivisionCode}`:""}{holiday.branchId?" · Branch-specific":""}</p></div><div className="flex flex-wrap gap-2">{holiday.source==="external"?<><Button size="sm" disabled={pending} onClick={()=>importHoliday(holiday,true)}>Import as Non-working</Button><Button size="sm" variant="outline" disabled={pending} onClick={()=>importHoliday(holiday,false)}>Classes Held</Button></>:<Button size="sm" variant="outline" disabled={pending} onClick={()=>run(()=>setPublicHolidayObservationAction({id:holiday.id,observedAsHoliday:!holiday.observedAsHoliday}))}>{holiday.observedAsHoliday?"Override: Classes Held":"Treat as Non-working"}</Button>}</div></CardContent></Card>)}</div>
    {feedback?<p role="status" className="rounded-xl border p-3 text-sm">{feedback}</p>:null}
  </div>;
}

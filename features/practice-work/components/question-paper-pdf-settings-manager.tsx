"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { saveQuestionPaperPdfSettingsAction } from "@/features/practice-work/actions/question-paper-pdf-settings-actions";
import type { QuestionPaperPdfSettings } from "@/features/practice-work/services/question-paper-pdf-settings-service";

export function QuestionPaperPdfSettingsManager({ initial }: { initial: QuestionPaperPdfSettings }) {
  const [settings, setSettings] = useState(initial);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const patch = <K extends keyof QuestionPaperPdfSettings>(key: K, value: QuestionPaperPdfSettings[K]) => setSettings((current) => ({ ...current, [key]: value }));
  const save = () => start(async () => { const result = await saveQuestionPaperPdfSettingsAction(settings); setMessage(result.message); });

  return <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
    <div className="space-y-5">
      <Card><CardHeader><CardTitle>Page Header</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
        <Select label="Header Type" value={settings.headerMode} set={(v) => patch("headerMode", v as QuestionPaperPdfSettings["headerMode"])} items={["text","image","none"]}/>
        {settings.headerMode === "image" ? <label className="text-sm font-medium md:col-span-2">Letterhead Image URL<Input value={settings.headerImageUrl} onChange={(e) => patch("headerImageUrl", e.target.value)} placeholder="https://.../letterhead.png"/><span className="mt-1 block text-xs text-muted-foreground">Use a publicly reachable PNG or JPG. The PDF will use it as the page header.</span></label> : null}
        {settings.headerMode === "text" ? <><label className="text-sm font-medium">Header Title<Input value={settings.headerTitle} onChange={(e) => patch("headerTitle", e.target.value)}/></label><label className="text-sm font-medium">Subtitle<Input value={settings.headerSubtitle} onChange={(e) => patch("headerSubtitle", e.target.value)}/></label><label className="text-sm font-medium md:col-span-2">Contact Line<Input value={settings.headerContact} onChange={(e) => patch("headerContact", e.target.value)}/></label></> : null}
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Watermark</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
        <Select label="Watermark Type" value={settings.watermarkMode} set={(v) => patch("watermarkMode", v as QuestionPaperPdfSettings["watermarkMode"])} items={["text","image","none"]}/>
        {settings.watermarkMode === "text" ? <label className="text-sm font-medium">Watermark Text<Input value={settings.watermarkText} onChange={(e) => patch("watermarkText", e.target.value)}/></label> : null}
        {settings.watermarkMode === "image" ? <label className="text-sm font-medium md:col-span-2">Watermark Image URL<Input value={settings.watermarkImageUrl} onChange={(e) => patch("watermarkImageUrl", e.target.value)} placeholder="https://.../logo.png"/></label> : null}
        {settings.watermarkMode !== "none" ? <><NumberField label="Opacity (0–1)" value={settings.watermarkOpacity} min={0} max={1} step={0.05} set={(v) => patch("watermarkOpacity", v)}/><NumberField label="Rotation" value={settings.watermarkRotation} min={-180} max={180} step={1} set={(v) => patch("watermarkRotation", v)}/><NumberField label="Text/Image Size" value={settings.watermarkSize} min={8} max={180} step={1} set={(v) => patch("watermarkSize", v)}/></> : null}
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Page Layout</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
        <NumberField label="Page Margin" value={settings.pageMargin} min={18} max={100} step={1} set={(v) => patch("pageMargin", v)}/>
        <label className="text-sm font-medium">Footer Text<Input value={settings.footerText} onChange={(e) => patch("footerText", e.target.value)}/></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.showPageNumbers} onChange={(e) => patch("showPageNumbers", e.target.checked)}/> Show page numbers</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.repeatHeader} onChange={(e) => patch("repeatHeader", e.target.checked)}/> Repeat header on every page</label>
      </CardContent></Card>
      <Button disabled={pending} onClick={save}>{pending ? "Saving…" : "Save as Institute Default"}</Button>
      {message ? <p role="status" className="text-sm">{message}</p> : null}
    </div>

    <Card><CardHeader><CardTitle>Live Layout Preview</CardTitle></CardHeader><CardContent><div className="relative mx-auto min-h-[720px] max-w-[520px] overflow-hidden border bg-white p-8 text-black shadow-sm">
      {settings.watermarkMode === "text" && settings.watermarkText ? <div className="pointer-events-none absolute left-1/2 top-1/2 whitespace-nowrap text-4xl font-bold" style={{opacity:settings.watermarkOpacity,transform:`translate(-50%,-50%) rotate(${settings.watermarkRotation}deg)`}}>{settings.watermarkText}</div> : null}
      {settings.watermarkMode === "image" && settings.watermarkImageUrl ? <img alt="Watermark preview" src={settings.watermarkImageUrl} className="pointer-events-none absolute left-1/2 top-1/2 max-w-[55%] -translate-x-1/2 -translate-y-1/2" style={{opacity:settings.watermarkOpacity,transform:`translate(-50%,-50%) rotate(${settings.watermarkRotation}deg)`}}/> : null}
      {settings.headerMode === "image" && settings.headerImageUrl ? <img alt="Letterhead preview" src={settings.headerImageUrl} className="mb-4 max-h-28 w-full object-contain"/> : null}
      {settings.headerMode === "text" ? <div className="mb-4 border-b pb-3 text-center"><p className="text-xl font-bold">{settings.headerTitle}</p><p className="text-sm">{settings.headerSubtitle}</p><p className="text-xs">{settings.headerContact}</p></div> : null}
      <h3 className="text-center font-bold">CBSE_CLASS_8_PRACTICE_DATE</h3><p className="mt-3 text-sm">Board: CBSE · Class: VIII · Full Marks: 20</p><p className="mt-5 text-sm font-semibold">Instructions</p><p className="text-sm">Answer all questions.</p><div className="mt-6 space-y-5 text-sm"><p><strong>1.</strong> Sample question appears here. <span className="float-right">[2]</span></p><p><strong>2.</strong> The actual saved paper will use these default PDF settings. <span className="float-right">[3]</span></p></div>
      {settings.footerText ? <p className="absolute bottom-5 left-0 w-full text-center text-xs">{settings.footerText}</p> : null}
    </div></CardContent></Card>
  </div>;
}

function Select({label,value,set,items}:{label:string;value:string;set:(value:string)=>void;items:string[]}){return <label className="text-sm font-medium">{label}<select value={value} onChange={(e)=>set(e.target.value)} className="mt-1 h-10 w-full rounded-xl border bg-card px-3">{items.map((item)=><option key={item} value={item}>{item.replaceAll("_"," ")}</option>)}</select></label>}
function NumberField({label,value,min,max,step,set}:{label:string;value:number;min:number;max:number;step:number;set:(value:number)=>void}){return <label className="text-sm font-medium">{label}<Input type="number" value={value} min={min} max={max} step={step} onChange={(e)=>set(Number(e.target.value))}/></label>}

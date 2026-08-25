"use client";

import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { SyllabusSubmissionAudit, SyllabusSubjectOption } from "@/features/student-syllabus/services/student-syllabus-service";

export function StudentSyllabusManager({subjects,history}:{subjects:SyllabusSubjectOption[];history:SyllabusSubmissionAudit[]}){
  const formRef=useRef<HTMLFormElement>(null);
  const[pending,setPending]=useState(false);
  const[message,setMessage]=useState("");
  const[messageType,setMessageType]=useState<"success"|"error"|"">("");
  const[filesSummary,setFilesSummary]=useState("");

  const submit=async(event:React.FormEvent<HTMLFormElement>)=>{
    event.preventDefault();setPending(true);setMessage("Sending syllabus pages by email…");setMessageType("");
    try{
      const response=await fetch("/api/student/syllabus-pages",{method:"POST",body:new FormData(event.currentTarget)});
      const result=await response.json() as {status:"success"|"error";message:string};
      setMessage(result.message);setMessageType(result.status);
      if(result.status==="success"){formRef.current?.reset();setFilesSummary("");window.setTimeout(()=>window.location.reload(),900)}
    }catch{setMessage("The syllabus pages could not be sent. Please try again.");setMessageType("error")}finally{setPending(false)}
  };

  return <div className="space-y-6">
    <Card><CardHeader><CardTitle>Send Syllabus Pages to Teacher</CardTitle></CardHeader><CardContent className="space-y-4">
      <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground"><p>Upload photos/scans from your book for teacher reference before an exam. The actual files are emailed and are <strong>not saved in Supabase Storage</strong>. Only submission details are kept for the audit trail.</p><p className="mt-2">Allowed: PDF, JPG/JPEG, PNG · maximum 8 files · 2 MB per file · 4 MB total. Larger sets can be sent as Part 1, Part 2, etc.</p></div>
      <form ref={formRef} onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium">Subject<select name="subjectId" required className="mt-1 h-10 w-full rounded-xl border bg-card px-3"><option value="">Select Subject</option>{subjects.map(subject=><option key={subject.id} value={subject.id}>{subject.label}</option>)}</select></label>
        <label className="text-sm font-medium">Book Name (optional)<Input name="bookName" maxLength={150}/></label>
        <label className="text-sm font-medium">Chapter / Topic (optional)<Input name="chapter" maxLength={150}/></label>
        <label className="text-sm font-medium">Exam / Test (optional)<Input name="examName" maxLength={150} placeholder="e.g. Half Yearly Exam"/></label>
        <label className="text-sm font-medium md:col-span-2">Photos / Scanned Pages / PDF<Input name="files" type="file" required multiple accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" onChange={event=>{const files=Array.from(event.target.files??[]),bytes=files.reduce((sum,file)=>sum+file.size,0);setFilesSummary(files.length?`${files.length} file${files.length===1?"":"s"} · ${(bytes/1024/1024).toFixed(2)} MB total`:"")}}/><span className="mt-1 block text-xs text-muted-foreground">On a phone, you can choose Camera/Photos or a scanned PDF depending on your device.</span>{filesSummary?<span className="mt-1 block text-xs font-medium">{filesSummary}</span>:null}</label>
        <label className="text-sm font-medium md:col-span-2">Note to Teacher (optional)<textarea name="note" maxLength={1000} className="mt-1 min-h-24 w-full rounded-xl border bg-card p-3" placeholder="Mention page range, important chapters, or anything the teacher should know."/></label>
        <div className="md:col-span-2"><Button type="submit" disabled={pending||!subjects.length}>{pending?"Sending…":"Email Syllabus Pages"}</Button></div>
      </form>
      {message?<p role="status" className={`rounded-xl border p-3 text-sm ${messageType==="error"?"text-destructive":""}`}>{message}</p>:null}
      {!subjects.length?<p className="text-sm text-destructive">No Subject is available for your current academic assignment.</p>:null}
    </CardContent></Card>

    <section className="space-y-3"><div><h2 className="text-xl font-semibold">My Syllabus Submission History</h2><p className="text-sm text-muted-foreground">Audit trail only. Submitted images/PDFs are not stored here.</p></div><div className="grid gap-3 lg:grid-cols-2">{history.length?history.map(item=><Card key={item.id}><CardContent className="space-y-2 p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{item.subjectName}</p><p className="text-sm text-muted-foreground">{[item.bookName,item.chapter,item.examName].filter(Boolean).join(" · ")||"Syllabus pages"}</p></div><Badge>{item.deliveryStatus}</Badge></div><p className="text-sm">{item.fileCount} file{item.fileCount===1?"":"s"} · {(item.totalBytes/1024/1024).toFixed(2)} MB</p><p className="break-all text-xs text-muted-foreground">{item.fileNames.join(", ")}</p><p className="text-xs text-muted-foreground">{new Date(item.submittedAt).toLocaleString("en-IN")}</p></CardContent></Card>):<Card><CardContent className="p-8 text-center text-muted-foreground">No syllabus pages sent yet.</CardContent></Card>}</div></section>
  </div>;
}

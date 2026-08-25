"use client";
import{useState,useTransition}from"react";
import{useRouter}from"next/navigation";
import{Badge}from"@/components/ui/badge";
import{Button}from"@/components/ui/button";
import{Card,CardContent,CardHeader,CardTitle}from"@/components/ui/card";
import{Input}from"@/components/ui/input";
import{assignPracticeSetAction}from"@/features/practice-work/actions/practice-work-actions";
import{assignUploadedQuestionFileAction,deleteUploadedQuestionFileAction}from"@/features/practice-work/actions/uploaded-question-file-actions";
import type{PracticeAssignment,PracticeOptions,PracticeSet}from"@/features/practice-work/types/practice-work";
import type{UploadedQuestionFile,UploadedQuestionFileAssignment}from"@/features/practice-work/services/uploaded-question-file-service";

export function AssignmentsManager({sets,assignments,options,uploadedFiles=[],fileAssignments=[]}:{sets:PracticeSet[];assignments:PracticeAssignment[];options:PracticeOptions;uploadedFiles?:UploadedQuestionFile[];fileAssignments?:UploadedQuestionFileAssignment[]}){
  const[pending,start]=useTransition(),router=useRouter(),[message,setMessage]=useState("");
  const finish=(r:{status:string;message:string})=>{setMessage(r.message);if(r.status==="success")router.refresh()};
  const removeFile=(file:UploadedQuestionFile)=>{const count=fileAssignments.filter(a=>a.sourceFileId===file.id).length;const warning=count?`Delete ${file.title}? This will also remove ${count} student assignment${count===1?"":"s"}. Students will no longer be able to open the file.`:`Delete ${file.title}? This permanently removes the uploaded file.`;if(!window.confirm(warning))return;start(async()=>finish(await deleteUploadedQuestionFileAction({sourceFileId:file.id})))};
  return <div className="space-y-6">
    <Card><CardHeader><CardTitle>Assign Uploaded Question File</CardTitle></CardHeader><CardContent className="space-y-3">
      <p className="text-sm text-muted-foreground">Assign the original PDF/JPG/PNG exactly as uploaded. Students view the file directly; no AI extraction or online answer attempt is created.</p>
      <form action={form=>start(async()=>finish(await assignUploadedQuestionFileAction({sourceFileId:form.get("sourceFileId"),batchId:form.get("fileBatchId"),studentIds:form.getAll("fileStudentIds"),availableFrom:form.get("fileAvailableFrom")||undefined,dueAt:form.get("fileDueAt")||undefined})))} className="grid gap-4 md:grid-cols-2">
        <Select name="sourceFileId" label="Uploaded Question File" required items={uploadedFiles.map(v=>({id:v.id,label:`${v.title} · ${v.subjectName??"Subject"} · ${v.className??"Class"}`}))}/>
        <Select name="fileBatchId" label="Entire Batch" items={options.batches}/>
        <label className="text-sm font-medium">Selected Students<select name="fileStudentIds" multiple className="mt-1 min-h-28 w-full rounded-xl border bg-card p-3">{options.students.map(v=><option key={v.id} value={v.id}>{v.label}</option>)}</select></label>
        <div className="grid gap-4"><label className="text-sm font-medium">Available From<Input name="fileAvailableFrom" type="datetime-local"/></label><label className="text-sm font-medium">Due At<Input name="fileDueAt" type="datetime-local"/></label></div>
        <Button type="submit" disabled={pending||!uploadedFiles.length}>Assign Uploaded File</Button>
      </form>
    </CardContent></Card>

    <Card><CardHeader><CardTitle>Saved Uploaded Question Files</CardTitle></CardHeader><CardContent><div className="grid gap-3 lg:grid-cols-2">{uploadedFiles.length?uploadedFiles.map(file=>{const count=fileAssignments.filter(a=>a.sourceFileId===file.id).length;return <div key={file.id} className="flex items-start justify-between gap-4 rounded-xl border p-4"><div className="min-w-0"><p className="font-semibold">{file.title}</p><p className="text-sm text-muted-foreground">{[file.subjectName,file.className,file.boardName].filter(Boolean).join(" · ")||file.originalFilename}</p><p className="mt-1 text-xs text-muted-foreground">{file.originalFilename} · {count} assignment{count===1?"":"s"}</p></div><Button type="button" variant="destructive" size="sm" disabled={pending} onClick={()=>removeFile(file)}>Delete</Button></div>}):<p className="text-sm text-muted-foreground">No uploaded question files saved yet.</p>}</div></CardContent></Card>

    <Card><CardHeader><CardTitle>Assign Generated Question Paper</CardTitle></CardHeader><CardContent><form action={form=>start(async()=>finish(await assignPracticeSetAction({practiceSetId:form.get("practiceSetId"),batchId:form.get("batchId"),studentIds:form.getAll("studentIds"),scheduleEventId:form.get("scheduleEventId"),availableFrom:form.get("availableFrom")||undefined,dueAt:form.get("dueAt")||undefined})))} className="grid gap-4 md:grid-cols-2"><Select name="practiceSetId" label="Published Question Paper" required items={sets.filter(v=>v.status==="published").map(v=>({id:v.id,label:v.title}))}/><Select name="batchId" label="Entire Batch" items={options.batches}/><label className="text-sm font-medium">Selected Students<select name="studentIds" multiple className="mt-1 min-h-28 w-full rounded-xl border bg-card p-3">{options.students.map(v=><option key={v.id} value={v.id}>{v.label}</option>)}</select></label><Select name="scheduleEventId" label="Learning Planner Event (optional)" items={options.events}/><label className="text-sm font-medium">Available From<Input name="availableFrom" type="datetime-local"/></label><label className="text-sm font-medium">Due At<Input name="dueAt" type="datetime-local"/></label><Button type="submit" disabled={pending}>Assign Question Paper</Button></form></CardContent></Card>

    {message&&<p role="status" className="rounded-xl border p-3 text-sm">{message}</p>}

    <div className="space-y-3"><h3 className="text-lg font-semibold">Uploaded File Assignments</h3><div className="grid gap-3 lg:grid-cols-2">{fileAssignments.length?fileAssignments.map(a=><Card key={a.id}><CardContent className="flex justify-between gap-3 p-5"><div><p className="font-semibold">{a.title}</p><p className="text-sm text-muted-foreground">{a.studentName} · {a.originalFilename} · Due {a.dueAt?new Date(a.dueAt).toLocaleString():"Not set"}</p></div><Badge>{a.status}</Badge></CardContent></Card>):<Card><CardContent className="p-6 text-center text-muted-foreground">No uploaded question files assigned yet.</CardContent></Card>}</div></div>

    <div className="space-y-3"><h3 className="text-lg font-semibold">Generated Paper Assignments</h3><div className="grid gap-3 lg:grid-cols-2">{assignments.map(a=><Card key={a.id}><CardContent className="flex justify-between gap-3 p-5"><div><p className="font-semibold">{a.practiceSetTitle}</p><p className="text-sm text-muted-foreground">{a.studentName} · Due {a.dueAt?new Date(a.dueAt).toLocaleString():"Not set"}</p></div><Badge>{a.status}</Badge></CardContent></Card>)}</div></div>
  </div>
}
function Select({name,label,items,required=false}:{name:string;label:string;items:{id:string;label:string}[];required?:boolean}){return <label className="text-sm font-medium">{label}<select name={name} required={required} className="mt-1 h-10 w-full rounded-xl border bg-card px-3"><option value="">Select</option>{items.map(v=><option key={v.id} value={v.id}>{v.label}</option>)}</select></label>}

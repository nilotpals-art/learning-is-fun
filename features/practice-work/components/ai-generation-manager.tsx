"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authorizeQuestionImportUploadAction, generateQuestionsAction, processUploadedQuestionImportAction, retryQuestionExtractionAction, reviewGeneratedQuestionsAction, updateGeneratedQuestionAction } from "@/features/practice-work/actions/practice-work-actions";
import { DIFFICULTIES, type GeneratedQuestion, type GenerationReviewContext, type PracticeOptions, type QuestionTemplate } from "@/features/practice-work/types/practice-work";
import { createClient } from "@/lib/supabase/client";

interface Props { templates: QuestionTemplate[]; options: PracticeOptions; generationId?: string; generationContext?:GenerationReviewContext|null; questions: GeneratedQuestion[]; workspace?: boolean }

export function AiGenerationManager({ templates, options, generationId, generationContext, questions, workspace = false }: Props) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<GeneratedQuestion | null>(null);
  const [generationPending,setGenerationPending]=useState(false);
  const [uploadState,setUploadState]=useState<"idle"|"preparing"|"authorizing"|"uploading"|"uploaded"|"validating"|"review"|"failed">("idle");
  const [importPending,setImportPending]=useState(false);
  const reviewHref = (id: string) => workspace ? `/practice-work?generation=${id}#review` : `/practice-work/question-bank/generate?generation=${id}`;
  const review = (decision: "approve" | "reject", override = false) => start(async () => {
    if (!generationId) return;
    const result = await reviewGeneratedQuestionsAction({ generationId, questionIds: selected, decision, overrideDuplicates: override });
    setMessage(result.message);
    if (result.status === "success") { setSelected([]); router.refresh(); }
  });
  const common = (prefix: string) => <>
    <Select name="boardId" label="Board" required items={options.boards} />
    <Select name="classId" label="Class" required items={options.classes} />
    <Select name="subjectId" label="Subject" required items={options.subjects ?? []} />
    <label className="text-sm font-medium">Book (optional)<Input name="bookName" /></label>
    <label className="text-sm font-medium">Chapter<Input name="chapter" /></label>
    <label className="text-sm font-medium">Question / Exam Date<Input name="questionExamDate" type="date" /></label>
    <label className="text-sm font-medium">Full Marks<Input name="sourceFullMarks" type="number" min="0.25" step="0.25" required aria-describedby={`${prefix}-marks-help`} /><span id={`${prefix}-marks-help`} className="mt-1 block text-xs text-muted-foreground">Marks context of the complete source.</span></label>
  </>;
  const goToReview = (result: Awaited<ReturnType<typeof generateQuestionsAction>>) => {
    setMessage(result.message);
    if (result.data) router.push(reviewHref(result.data.generationId));
  };
  const generateQuestions=async(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();setMessage("Generating questions with Gemini…");setGenerationPending(true);const form=new FormData(event.currentTarget);try{goToReview(await generateQuestionsAction({boardId:form.get("boardId"),classId:form.get("classId"),subjectId:form.get("subjectId"),bookName:form.get("bookName"),chapter:form.get("chapter"),questionExamDate:form.get("questionExamDate"),sourceFullMarks:form.get("sourceFullMarks"),templateId:form.get("templateId"),questionCount:form.get("questionCount"),difficulty:form.get("difficulty"),specialInstructions:form.get("specialInstructions"),includeAnswers:true,includeExplanations:true,avoidDuplicates:true,keepLanguageSimple:true}))}catch{setMessage("Gemini generation is temporarily unavailable.")}finally{setGenerationPending(false)}};
  const showRequiredMessage=(event:FormEvent<HTMLFormElement>,message:string)=>{event.preventDefault();setMessage(message);(event.target as HTMLInputElement|HTMLSelectElement).focus()};
  const importFile=async(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();setUploadState("preparing");setMessage("Preparing upload…");setImportPending(true);const form=new FormData(event.currentTarget),file=form.get("file");let stage:"preparing"|"authorization"|"storage"|"validation"="preparing";try{if(!(file instanceof File)||!file.size)throw new Error("Select a source file.");stage="authorization";setUploadState("authorizing");setMessage("Authorizing upload…");const authorization=await authorizeQuestionImportUploadAction({filename:file.name,mimeType:file.type,byteSize:file.size});if(authorization.status==="error"||!authorization.data){setUploadState("failed");setMessage(authorization.message);return}const hash=await crypto.subtle.digest("SHA-256",await file.arrayBuffer()),clientSha256=Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,"0")).join("");stage="storage";setUploadState("uploading");setMessage("Uploading to private storage…");const upload=await createClient().storage.from("practice-work-private").uploadToSignedUrl(authorization.data.storagePath,authorization.data.uploadToken,file,{contentType:file.type});if(upload.error){const storageError=upload.error as typeof upload.error&{statusCode?:string|number;status?:number;error?:string};const status=storageError.statusCode??storageError.status,code=storageError.error??storageError.name,details=[status?`HTTP ${status}`:null,code&&code!=="StorageUnknownError"?code:null,storageError.message].filter(Boolean).join(" · ");setUploadState("failed");setMessage(`Storage upload failed: ${details}`);return}setUploadState("uploaded");setMessage("Upload complete");stage="validation";setUploadState("validating");setMessage(file.type==="image/jpeg"||file.type==="image/png"?"Validating document, then extracting questions with Gemini…":"Validating document…");const result=await processUploadedQuestionImportAction({sourceId:authorization.data.sourceId,storagePath:authorization.data.storagePath,originalFilename:file.name,declaredMimeType:file.type,declaredByteSize:file.size,clientSha256,boardId:form.get("boardId"),classId:form.get("classId"),subjectId:form.get("subjectId"),bookName:form.get("bookName"),chapter:form.get("chapter"),questionExamDate:form.get("questionExamDate"),sourceFullMarks:form.get("sourceFullMarks")});if(result.status==="error"){setUploadState("failed");setMessage(result.message);if(result.data)router.push(reviewHref(result.data.generationId));return}setUploadState("review");goToReview(result)}catch(error){const fallback=error instanceof Error&&error.message?error.message:"The request could not be completed.";setUploadState("failed");setMessage(`${stage==="authorization"?"Upload authorization failed":stage==="storage"?"Storage upload failed":"Document validation failed"}: ${fallback}`)}finally{setImportPending(false)}};

  return <div className="space-y-6">
    <Tabs defaultValue="ai">
      <TabsList><TabsTrigger value="ai">Generate with AI</TabsTrigger><TabsTrigger value="import">Import File</TabsTrigger></TabsList>
      <TabsContent value="ai"><Card><CardHeader><CardTitle>Generate with AI</CardTitle></CardHeader><CardContent>
        <form onSubmit={generateQuestions} onInvalid={(event)=>showRequiredMessage(event,"Complete the required fields: Board, Class, Subject, Full Marks, Template, and Number of Questions.")} className="grid gap-4 md:grid-cols-3">
          {common("ai")}<Select name="templateId" label="Template" required items={templates.filter((item) => item.isActive).map((item) => ({ id: item.id, label: item.name }))} />
          <label className="text-sm font-medium">Difficulty<select name="difficulty" className="mt-1 h-10 w-full rounded-xl border bg-card px-3">{DIFFICULTIES.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="text-sm font-medium">Number of Questions<Input name="questionCount" type="number" min="1" max="30" defaultValue="5" required /></label>
          <label className="text-sm font-medium md:col-span-3">Custom Instructions (optional)<textarea name="specialInstructions" maxLength={2000} className="mt-1 min-h-24 w-full rounded-xl border bg-card p-3" /></label>
          <div className="md:col-span-3"><Button type="submit" disabled={generationPending || !templates.some((item) => item.isActive)}>{generationPending?"Generating…":"Generate Questions"}</Button></div>
        </form>
      </CardContent></Card></TabsContent>
      <TabsContent value="import"><Card><CardHeader><CardTitle>Import File</CardTitle></CardHeader><CardContent>
        <form onSubmit={importFile} onInvalid={(event)=>{setUploadState("failed");showRequiredMessage(event,"Complete the required fields: Board, Class, Subject, Full Marks, and Source File.")}} className="grid gap-4 md:grid-cols-3">
          {common("import")}<label className="text-sm font-medium md:col-span-2">Source File<Input name="file" type="file" required accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png" /><span className="mt-1 block text-xs text-muted-foreground">Text PDFs and DOCX use native extraction. Scanned PDFs, JPEG and PNG use Gemini. Legacy DOC is unsupported.</span></label>
          <div className="flex border-t pt-4 md:col-span-3"><Button type="submit" className="w-full sm:w-auto" disabled={importPending}>{importPending?"Preparing upload…":"Upload File and Extract Questions"}</Button></div>
        </form>
        {uploadState!=="idle"?<p className="mt-3 text-sm font-medium" role="status">{{preparing:"Preparing upload…",authorizing:"Authorizing upload…",uploading:"Uploading to private storage…",uploaded:"Upload complete",validating:"Validating document…",review:"Review required",failed:"Upload failed",idle:""}[uploadState]}</p>:null}
      </CardContent></Card></TabsContent>
    </Tabs>
    {message ? <p role="status" className="rounded-xl border p-3 text-sm">{message}</p> : null}
    {generationId ? <section id="review" className="scroll-mt-24 space-y-4">
      <div><h3 className="text-xl font-semibold">Review Questions</h3><p className="text-sm text-muted-foreground">Edit drafts, resolve extraction and duplicate warnings, confirm answers and marks, then approve or reject.</p></div>
      {generationContext?.status==="failed"?<div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><p>Extraction could not be completed. The private source file is retained, so you can retry without uploading it again.</p><Button className="mt-3" type="button" disabled={pending} onClick={()=>start(async()=>{const result=await retryQuestionExtractionAction({generationId:generationContext.id});setMessage(result.message);if(result.status==="success")router.refresh()})}>Retry Extraction</Button></div>:null}
      <div className="flex flex-wrap gap-2"><Button type="button" disabled={pending || !selected.length} onClick={() => review("approve")}>Approve Selected</Button><Button type="button" variant="outline" disabled={pending || !selected.length} onClick={() => review("approve", true)}>Approve Duplicate Override</Button><Button type="button" variant="destructive" disabled={pending || !selected.length} onClick={() => review("reject")}>Reject Selected</Button></div>
      <p className="text-sm text-muted-foreground">Proposed total marks: {questions.reduce((sum, question) => sum + question.suggestedMarks, 0)}{generationContext?.sourceFullMarks!==null&&generationContext?.sourceFullMarks!==undefined?` / Source Full Marks: ${generationContext.sourceFullMarks} / Difference: ${questions.reduce((sum,question)=>sum+question.suggestedMarks,0)-generationContext.sourceFullMarks}`:""}</p>
      <div className="grid gap-4 lg:grid-cols-2">{questions.length ? questions.map((question) => <Card key={question.id}><CardContent className="space-y-3 p-5"><div className="flex items-start gap-3"><input aria-label={`Select ${question.questionText}`} type="checkbox" checked={selected.includes(question.id)} onChange={(event) => setSelected((value) => event.target.checked ? [...value, question.id] : value.filter((id) => id !== question.id))} /><div className="min-w-0 flex-1"><p className="font-semibold">{question.questionText}</p><p className="mt-2 text-sm">Answer: {String(question.correctAnswer)}</p><p className="text-sm text-muted-foreground">{question.explanation}</p><p className="mt-2 text-xs">{question.suggestedMarks} marks{question.sourcePage ? ` · Page ${question.sourcePage}` : ""}</p></div><Badge>{question.reviewStatus}</Badge></div>{question.duplicateWarning ? <p className="text-sm font-medium text-amber-700">Possible duplicate — review before approval.</p> : null}{question.reviewStatus === "pending" ? <Button type="button" size="sm" variant="outline" onClick={() => setEditing(question)}>Edit Draft</Button> : null}</CardContent></Card>) : <Card><CardContent className="p-8 text-center text-muted-foreground">No draft Questions were detected.</CardContent></Card>}</div>
    </section> : <section id="review" className="scroll-mt-24 rounded-2xl border border-dashed p-6"><h3 className="font-semibold">Review Questions</h3><p className="mt-1 text-sm text-muted-foreground">Generated or imported drafts appear here without leaving this workspace.</p></section>}
    {editing ? <Card><CardHeader><CardTitle>Edit Draft Question</CardTitle></CardHeader><CardContent><form action={(form) => start(async () => { const result = await updateGeneratedQuestionAction({ ...editing, questionText: form.get("questionText"), suggestedMarks: form.get("suggestedMarks"), explanation: form.get("explanation") }); setMessage(result.message); if (result.status === "success") { setEditing(null); router.refresh(); } })} className="grid gap-4"><label className="text-sm font-medium">Question<textarea name="questionText" defaultValue={editing.questionText} required className="mt-1 min-h-24 w-full rounded-xl border p-3" /></label><label className="text-sm font-medium">Suggested Answer / Explanation<textarea name="explanation" defaultValue={editing.explanation} className="mt-1 min-h-20 w-full rounded-xl border p-3" /></label><label className="text-sm font-medium">Marks<Input name="suggestedMarks" type="number" min="0.25" step="0.25" defaultValue={editing.suggestedMarks} /></label><div className="flex gap-2"><Button type="submit" disabled={pending}>Save Draft</Button><Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button></div></form></CardContent></Card> : null}
  </div>;
}

function Select({ name, label, items, required = false }: { name: string; label: string; items: { id: string; label: string }[]; required?: boolean }) {
  return <label className="text-sm font-medium">{label}<select name={name} required={required} className="mt-1 h-10 w-full rounded-xl border bg-card px-3"><option value="">{required ? "Select" : "Not specified"}</option>{items.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>;
}

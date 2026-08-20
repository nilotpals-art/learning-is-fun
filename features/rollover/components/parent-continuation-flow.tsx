"use client";

import { ArrowLeft, ArrowRight, CalendarClock, CheckCircle2, GraduationCap, Lock, ShieldAlert } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Toaster, toast } from "@/components/ui/toast";
import { confirmParentRollover, saveParentRolloverResponse } from "@/features/rollover/actions/rollover-actions";
import { JOINING_TYPE_LABELS, ROLLOVER_RESPONSE_LABELS, type RolloverBatchOption, type RolloverRequestDetail } from "@/features/rollover/types/rollover";
import { cn } from "@/lib/utils";

type FlowStep = "response" | "joining" | "batch" | "review" | "done";
type FlowResponse = "continuing" | "not_continuing" | "undecided";

const selectedClass = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30";

function StepIndicator({ current }: { current: number }) {
  const labels = ["Your choice", "Joining", "Batch", "Review"];
  return <ol className="flex flex-wrap items-center gap-2 text-xs"><li className="flex items-center gap-2"><Badge className="border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200">{current}/4</Badge><span className="font-semibold">{labels[Math.min(current, 4) - 1]}</span></li></ol>;
}

export function ParentContinuationFlow({ detail, batches }: {
  detail: RolloverRequestDetail;
  batches: RolloverBatchOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<FlowStep>(() => {
    if (detail.isLocked || ["completed", "cancelled", "rejected"].includes(detail.adminStatus)) return "done";
    if (detail.parentResponse !== "pending") return detail.parentResponse === "continuing" ? "review" : "done";
    return "response";
  });
  const [response, setResponse] = useState<FlowResponse>(() => detail.parentResponse === "continuing" ? "continuing" : detail.parentResponse === "not_continuing" ? "not_continuing" : detail.parentResponse === "undecided" ? "undecided" : "continuing");
  const [joiningType, setJoiningType] = useState<"normal" | "delayed">(detail.joiningType ?? "normal");
  const [expectedDate, setExpectedDate] = useState(detail.expectedJoiningDate ?? "");
  const [selectedBatchId, setSelectedBatchId] = useState(detail.selectedBatchId ?? "");
  const [notes, setNotes] = useState(detail.parentNotes ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  if (detail.isLocked || ["completed", "cancelled", "rejected"].includes(detail.adminStatus)) {
    const blocked = ["completed", "cancelled", "rejected"].includes(detail.adminStatus);
    return <div className="mx-auto max-w-2xl space-y-6"><Toaster /><Card><CardContent className="space-y-4 p-6">
      <div className="flex items-center gap-3"><div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"><Lock className="size-6" /></div><div><h2 className="text-xl font-bold">{blocked ? "Request resolved" : "Choice confirmed and locked"}</h2><p className="text-sm text-muted-foreground">{detail.studentName} · {detail.sourceYearName} → {detail.targetYearName}</p></div></div>
      <dl className="grid gap-3 rounded-2xl bg-muted/60 p-4 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Proposed Class</dt><dd className="font-semibold">{detail.proposedClassName}</dd></div><div><dt className="text-muted-foreground">Status</dt><dd className="font-semibold">{ROLLOVER_RESPONSE_LABELS[detail.parentResponse]}</dd></div>{detail.selectedBatchName ? <div><dt className="text-muted-foreground">Batch</dt><dd className="font-semibold">{detail.selectedBatchName}</dd></div> : null}{detail.expectedJoiningDate ? <div><dt className="text-muted-foreground">Joining</dt><dd className="font-semibold">{detail.expectedJoiningDate}</dd></div> : null}<div><dt className="text-muted-foreground">Confirmed</dt><dd className="font-semibold">{detail.parentConfirmedAt ? new Date(detail.parentConfirmedAt).toLocaleString("en-IN") : "—"}</dd></div></dl>
      <p className="text-sm text-muted-foreground">{blocked ? "The institute has closed this request. Contact the administration if you have questions." : "Your choice is locked and cannot be changed online. The institute will assign your child based on the confirmed details."}</p>
      <div className="flex justify-end"><Button variant="outline" onClick={() => router.push("/parent/continuation")}><ArrowLeft />Back to Continuation</Button></div>
    </CardContent></Card></div>;
  }

  function saveSimple(next: FlowResponse) {
    startTransition(async () => {
      const result = await saveParentRolloverResponse({
        requestId: detail.requestId,
        parentResponse: next,
        joiningType: null,
        expectedJoiningDate: null,
        selectedBatchId: null,
        notes: notes || null,
      });
      if (result.status === "error") {
        toast.add({ title: "Error", description: result.message, type: "error" });
        return;
      }
      setMessage(result.message);
      setCompleted(true);
      setStep("done");
      router.refresh();
    });
  }

  function confirm() {
    if (joiningType === "delayed" && !expectedDate) {
      toast.add({ title: "Error", description: "Enter the expected joining date.", type: "error" });
      setStep("joining");
      return;
    }
    if (!selectedBatchId) {
      toast.add({ title: "Error", description: "Select a Batch.", type: "error" });
      setStep("batch");
      return;
    }
    startTransition(async () => {
      const saveResult = await saveParentRolloverResponse({
        requestId: detail.requestId,
        parentResponse: "continuing",
        joiningType,
        expectedJoiningDate: joiningType === "delayed" ? expectedDate : null,
        selectedBatchId,
        notes: notes || null,
      });
      if (saveResult.status === "error") {
        toast.add({ title: "Error", description: saveResult.message, type: "error" });
        return;
      }
      const confirmResult = await confirmParentRollover({ requestId: detail.requestId });
      if (confirmResult.status === "error") {
        toast.add({ title: "Error", description: confirmResult.message, type: "error" });
        return;
      }
      setMessage(confirmResult.message);
      setStep("done");
      router.refresh();
    });
  }

  if (step === "done") {
    return <div className="mx-auto max-w-2xl space-y-6"><Toaster /><Card><CardContent className="space-y-4 p-6">
      <div className="flex items-center gap-3"><div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"><CheckCircle2 className="size-6" /></div><div><h2 className="text-xl font-bold">{response === "continuing" && !completed ? "Confirmation recorded" : completed ? "Response recorded" : "Thanks"}</h2><p className="text-sm text-muted-foreground">{message ?? "Your response has been recorded."}</p></div></div>
      {response === "continuing" ? <p className="rounded-xl bg-muted/60 p-4 text-sm">The institute will finalize your child&apos;s placement for <span className="font-semibold">{detail.targetYearName}</span>. You will not be able to change the selection after confirmation.</p> : <p className="rounded-xl bg-muted/60 p-4 text-sm">{response === "not_continuing" ? "Your child will not be promoted. The institute will review your request." : "You can update your decision until the response deadline."}</p>}
      <div className="flex justify-end"><Button variant="outline" onClick={() => router.push("/parent/continuation")}><ArrowLeft />Back to Continuation</Button></div>
    </CardContent></Card></div>;
  }

  return <div className="mx-auto max-w-3xl space-y-6"><Toaster /><Card><CardContent className="space-y-6 p-6">
    <StepIndicator current={step === "response" ? 1 : step === "joining" ? 2 : step === "batch" ? 3 : 4} />
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-bold">{detail.studentName}</h2><p className="text-sm text-muted-foreground">{detail.admissionNo} · {detail.proposedClassName}</p></div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground"><GraduationCap className="size-4" /><span className="font-semibold">{detail.sourceYearName}</span><ArrowRight className="size-4" /><span className="font-semibold">{detail.targetYearName}</span></div>
    </div>
    {detail.responseDeadline ? <p className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarClock className="size-4" />Please respond by {detail.responseDeadline}</p> : null}

    {step === "response" ? <fieldset className="space-y-3"><legend className="text-sm font-semibold">Will {detail.studentName} continue to {detail.targetYearName}?</legend>
      {([["continuing", "Continue — my child will continue next year"], ["not_continuing", "Not continuing — my child is leaving the institute"], ["undecided", "Undecided — I need more time"]] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setResponse(value)} className={cn("flex w-full items-center justify-between rounded-2xl border bg-card p-4 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40", response === value ? selectedClass : "hover:bg-muted")}>{label}<span aria-hidden="true" className="text-lg">{response === value ? "✓" : "○"}</span></button>)}
      <div className="pt-2"><label className="text-sm font-semibold">Notes for the institute (optional)</label><textarea className="mt-2 flex min-h-20 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any information the institute should know" /></div>
      <div className="flex justify-end"><Button onClick={() => { if (response === "continuing") { setStep("joining"); } else { saveSimple(response); } }} disabled={pending}><ArrowRight />Continue</Button></div>
    </fieldset> : null}

    {step === "joining" ? <fieldset className="space-y-3"><legend className="text-sm font-semibold">When will {detail.studentName} join?</legend>
      {(["normal", "delayed"] as const).map((value) => <button key={value} type="button" onClick={() => setJoiningType(value)} className={cn("flex w-full items-center justify-between rounded-2xl border bg-card p-4 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40", joiningType === value ? selectedClass : "hover:bg-muted")}><span>{JOINING_TYPE_LABELS[value]}</span><span aria-hidden="true" className="text-lg">{joiningType === value ? "✓" : "○"}</span></button>)}
      {joiningType === "delayed" ? <div className="space-y-2"><label className="text-sm font-semibold">Expected joining date</label><Input type="date" value={expectedDate} min={detail.targetYearStart ?? undefined} onChange={(e) => setExpectedDate(e.target.value)} /><p className="text-xs text-muted-foreground">Delayed joining is recorded as an enrollment break until this date.</p></div> : null}
      <div className="flex justify-between"><Button variant="outline" onClick={() => setStep("response")} disabled={pending}><ArrowLeft />Back</Button><Button onClick={() => setStep("batch")} disabled={pending}><ArrowRight />Continue</Button></div>
    </fieldset> : null}

    {step === "batch" ? <div className="space-y-3"><h3 className="text-sm font-semibold">Choose the preferred batch</h3>
      {batches.length === 0 ? <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">No batches are available yet for {detail.proposedClassName} in {detail.targetYearName}. Your selection will be saved; the institute may finalize it later.</p> : <div className="grid gap-3">{batches.map((batch) => { const full = batch.available != null && batch.available < 1; const isSelected = selectedBatchId === batch.batchId; return <button key={batch.batchId} type="button" disabled={full && !isSelected} onClick={() => setSelectedBatchId(batch.batchId)} className={cn("flex items-center justify-between gap-4 rounded-2xl border bg-card p-4 text-left transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-50", isSelected ? selectedClass : "hover:bg-muted")}><div><p className="font-bold">{batch.batchName}</p><p className="text-xs text-muted-foreground">{batch.branchName ?? "Main branch"}{batch.subjectName ? ` · ${batch.subjectName}` : ""}</p></div><div className="text-right"><Badge variant={full ? "destructive" : isSelected ? "default" : "secondary"}>{batch.available == null ? "Unlimited seats" : full ? "Full" : `${batch.available} seat${batch.available === 1 ? "" : "s"} left`}</Badge>{isSelected ? <p className="mt-1 text-xs font-semibold text-emerald-600">Selected ✓</p> : null}</div></button>; })}</div>}
      <div className="flex justify-between"><Button variant="outline" onClick={() => setStep("joining")} disabled={pending}><ArrowLeft />Back</Button><Button onClick={() => setStep("review")} disabled={pending}><ArrowRight />Review</Button></div>
    </div> : null}

    {step === "review" ? <div className="space-y-4"><h3 className="text-sm font-semibold">Review and confirm</h3>
      <dl className="grid gap-3 rounded-2xl bg-muted/60 p-4 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Continuation</dt><dd className="font-semibold">Continuing</dd></div><div><dt className="text-muted-foreground">Joining</dt><dd className="font-semibold">{JOINING_TYPE_LABELS[joiningType]}{joiningType === "delayed" ? ` — ${expectedDate}` : ""}</dd></div><div><dt className="text-muted-foreground">Batch</dt><dd className="font-semibold">{batches.find((b) => b.batchId === selectedBatchId)?.batchName ?? "No batch selected"}</dd></div><div><dt className="text-muted-foreground">Class</dt><dd className="font-semibold">{detail.proposedClassName}</dd></div></dl>
      <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"><ShieldAlert className="mt-0.5 size-5 shrink-0" /><p>After you confirm, your choice is <span className="font-semibold">locked</span> and cannot be changed online. If you need a change, contact the institute administration.</p></div>
      <div className="flex justify-between"><Button variant="outline" onClick={() => setStep("batch")} disabled={pending}><ArrowLeft />Back</Button><Button onClick={confirm} disabled={pending}>{pending ? "Confirming…" : "Confirm & Lock"}</Button></div>
    </div> : null}
  </CardContent></Card></div>;
}
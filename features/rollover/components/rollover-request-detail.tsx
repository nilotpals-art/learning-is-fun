"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Ban, CalendarOff, CheckCircle2, ClipboardList, ShieldAlert } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Toaster, toast } from "@/components/ui/toast";
import { adminOverrideRolloverBatch, approveRolloverRequest, cancelEnrollmentBreak, completeEnrollmentBreak, createEnrollmentBreak, finalizeRollover, resolveRolloverRequest } from "@/features/rollover/actions/rollover-actions";
import { BREAK_FEE_TREATMENT_LABELS, JOINING_TYPE_LABELS, ROLLOVER_ADMIN_STATUS_LABELS, ROLLOVER_RESPONSE_LABELS, type AdminEnrollmentBreak, type RolloverBatchOption, type RolloverRequestDetail } from "@/features/rollover/types/rollover";
import { approveRolloverSchema, createBreakSchema, overrideRolloverSchema, resolveRolloverSchema, type ApproveRolloverValues, type CreateBreakValues, type OverrideRolloverValues, type ResolveRolloverValues } from "@/features/rollover/validations/rollover-schema";
import { cn } from "@/lib/utils";

const controlClass = "flex h-10 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35 disabled:opacity-50";
const inputClass = "flex h-10 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35 disabled:opacity-50";

const statusBadge: Record<string, string> = {
  pending: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
  ready: "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200",
  approved: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  rejected: "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200",
  completed: "border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200",
  cancelled: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
};

const breakStatusBadge: Record<string, string> = {
  scheduled: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
  active: "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200",
  completed: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  cancelled: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
};

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div className="space-y-2"><label className="text-sm font-semibold">{label}</label>{children}{error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}</div>;
}

interface BreakOptions {
  students: Array<{ id: string; label: string }>;
  academicYears: Array<{ id: string; label: string }>;
  batches: Array<{ id: string; label: string }>;
}

export function RolloverRequestDetail({ detail, batches, breaks, breakOptions }: {
  detail: RolloverRequestDetail;
  batches: RolloverBatchOption[];
  breaks: AdminEnrollmentBreak[];
  breakOptions: BreakOptions;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [breakOpen, setBreakOpen] = useState(false);
  const [completingBreak, setCompletingBreak] = useState<AdminEnrollmentBreak | null>(null);

  const studentBreaks = useMemo(() => breaks.filter((b) => b.studentId === detail.studentId), [breaks, detail.studentId]);
  const selectedBatch = batches.find((b) => b.batchId === detail.selectedBatchId);
  const canManage = !["completed", "cancelled", "rejected"].includes(detail.adminStatus);

  const overrideForm = useForm<OverrideRolloverValues>({ resolver: zodResolver(overrideRolloverSchema), defaultValues: { requestId: detail.requestId, newBatchId: "", reason: "" } });
  const finalizeForm = useForm<{ requestId: string; remarks: string }>({ defaultValues: { requestId: detail.requestId, remarks: "" } });
  const resolveForm = useForm<ResolveRolloverValues>({ resolver: zodResolver(resolveRolloverSchema), defaultValues: { requestId: detail.requestId, adminStatus: "rejected", notes: "" } });
  const approveForm = useForm<ApproveRolloverValues>({ resolver: zodResolver(approveRolloverSchema), defaultValues: { requestId: detail.requestId, notes: "" } });
  const breakForm = useForm<CreateBreakValues>({ resolver: zodResolver(createBreakSchema), defaultValues: { studentId: detail.studentId, academicYearId: detail.targetYearId, batchId: detail.selectedBatchId ?? "", breakFrom: "", breakTo: "", reason: "", feeTreatment: "normal", feeTreatmentNotes: "" } });
  const completeForm = useForm<{ breakId: string; actualResumptionDate: string }>({ defaultValues: { breakId: "", actualResumptionDate: "" } });

  function run(action: Promise<{ status: "success" | "error"; message: string; fieldErrors?: Record<string, string[] | undefined> }>, onOpen: (open: boolean) => void) {
    startTransition(async () => {
      const result = await action;
      if (result.status === "error") {
        toast.add({ title: "Error", description: result.message, type: "error" });
        return;
      }
      onOpen(false);
      toast.add({ title: "Success", description: result.message, type: "success" });
      router.refresh();
    });
  }

  const canFinalize = detail.parentResponse === "continuing" && detail.selectedBatchId && (detail.parentConfirmedAt !== null || detail.adminStatus === "approved");

  return <div className="space-y-6"><Toaster />
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Button variant="outline" onClick={() => router.push("/students/rollover")}><ArrowLeft />Rollover Workspace</Button>
      {canManage ? <div className="flex flex-wrap gap-2">
        {canFinalize ? <Button onClick={() => setFinalizeOpen(true)} disabled={pending}><CheckCircle2 />Finalize Rollover</Button> : null}
        {detail.parentResponse === "continuing" && detail.selectedBatchId && detail.adminStatus !== "approved" ? <Button variant="outline" onClick={() => { approveForm.reset({ requestId: detail.requestId, notes: "" }); setApproveOpen(true); }} disabled={pending}><CheckCircle2 />Approve for Finalization</Button> : null}
        <Button variant="outline" onClick={() => { overrideForm.reset({ requestId: detail.requestId, newBatchId: "", reason: "" }); setOverrideOpen(true); }} disabled={pending || detail.selectedBatchId == null}><ShieldAlert />Override Batch</Button>
        <Button variant="ghost" onClick={() => { resolveForm.reset({ requestId: detail.requestId, adminStatus: "rejected", notes: "" }); setResolveOpen(true); }} disabled={pending}><Ban />Not Continuing / Cancel</Button>
      </div> : null}
    </div>
    <Card><CardContent className="grid gap-6 p-6 lg:grid-cols-2">
      <div className="space-y-3"><h2 className="text-lg font-bold">{detail.studentName}</h2><p className="text-sm text-muted-foreground">Admission No. {detail.admissionNo}</p>
        <dl className="space-y-2 text-sm"><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Proposed Class</dt><dd className="font-semibold">{detail.proposedClassName}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Board</dt><dd className="font-semibold">{detail.proposedBoardName}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Rollover</dt><dd className="font-semibold">{detail.sourceYearName} → {detail.targetYearName}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Response Deadline</dt><dd className="font-semibold">{detail.responseDeadline ?? "Not set"}</dd></div></dl>
      </div>
      <div className="space-y-3"><h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Parent Decision</h3>
        <div className="flex flex-wrap gap-2"><Badge className={statusBadge[detail.adminStatus]}>{ROLLOVER_ADMIN_STATUS_LABELS[detail.adminStatus]}</Badge><Badge className="border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{ROLLOVER_RESPONSE_LABELS[detail.parentResponse]}</Badge>{detail.joiningType ? <Badge variant="secondary">{JOINING_TYPE_LABELS[detail.joiningType]}</Badge> : null}</div>
        <dl className="space-y-2 text-sm"><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Selected Batch</dt><dd className="font-semibold">{detail.selectedBatchName ?? "Not selected"}</dd></div>{detail.selectedBatchSubject ? <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Subject</dt><dd className="font-semibold">{detail.selectedBatchSubject}</dd></div> : null}{detail.seatsAvailable != null ? <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Seats Available</dt><dd className="font-semibold">{detail.seatsAvailable}</dd></div> : null}<div className="flex justify-between gap-4"><dt className="text-muted-foreground">Confirmed</dt><dd className="font-semibold">{detail.parentConfirmedAt ? new Date(detail.parentConfirmedAt).toLocaleString("en-IN") : "Not yet"}</dd></div>{detail.expectedJoiningDate ? <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Expected Joining</dt><dd className="font-semibold">{detail.expectedJoiningDate}</dd></div> : null}</dl>
        {detail.parentNotes ? <p className="text-sm text-muted-foreground">Parent note: “{detail.parentNotes}”</p> : null}
        {detail.adminNotes ? <p className="whitespace-pre-line text-sm text-muted-foreground">Admin notes: {detail.adminNotes}</p> : null}
      </div>
    </CardContent></Card>

    <Card><CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList />Eligible Batches (Target Year)</CardTitle></CardHeader><CardContent>
      {batches.length === 0 ? <p className="text-sm text-muted-foreground">No active batches match the proposed Board and Class for the Target Year.</p> : <div className="hidden lg:block"><Table><TableHeader><TableRow><TableHead>Batch</TableHead><TableHead>Branch</TableHead><TableHead>Subject</TableHead><TableHead>Capacity</TableHead><TableHead>Assigned</TableHead><TableHead>Reserved</TableHead><TableHead>Available</TableHead><TableHead>Selection</TableHead></TableRow></TableHeader><TableBody>{batches.map((batch) => { const isSelected = batch.batchId === detail.selectedBatchId; const full = batch.available != null && batch.available < 1; return <TableRow key={batch.batchId} className={cn(isSelected && "bg-emerald-50/50 dark:bg-emerald-950/20")}><TableCell className="font-semibold">{batch.batchName}</TableCell><TableCell>{batch.branchName ?? "—"}</TableCell><TableCell>{batch.subjectName ?? "—"}</TableCell><TableCell>{batch.capacity ?? "Unlimited"}</TableCell><TableCell>{batch.assigned}</TableCell><TableCell>{batch.reserved}</TableCell><TableCell>{batch.available ?? "Unlimited"}</TableCell><TableCell>{isSelected ? <Badge className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">Selected</Badge> : <Badge variant={full ? "destructive" : "secondary"}>{full ? "Full" : "Available"}</Badge>}</TableCell></TableRow>; })}</TableBody></Table></div>}
      {batches.length > 0 ? <div className="grid gap-3 lg:hidden">{batches.map((batch) => { const isSelected = batch.batchId === detail.selectedBatchId; return <article key={batch.batchId} className={cn("rounded-2xl border p-4", isSelected ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20" : "bg-card")}><div className="flex items-center justify-between gap-3"><p className="font-bold">{batch.batchName}</p>{isSelected ? <Badge className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">Selected</Badge> : null}</div><p className="text-xs text-muted-foreground">{batch.branchName ?? "—"} · {batch.subjectName ?? "—"}</p><p className="mt-2 text-sm">Available: {batch.available ?? "Unlimited"}{batch.capacity != null ? ` of ${batch.capacity}` : ""} · Assigned {batch.assigned} · Reserved {batch.reserved}</p></article>; })}</div> : null}
      {detail.selectedBatchId && selectedBatch && <p className="mt-4 rounded-xl bg-muted/60 p-3 text-sm"><span className="font-semibold">Currently selected:</span> {selectedBatch.batchName} · Available seats: {selectedBatch.available ?? "Unlimited"}</p>}
    </CardContent></Card>

    <Card><CardHeader><CardTitle className="flex items-center gap-2"><CalendarOff />Enrollment Breaks ({studentBreaks.length})</CardTitle></CardHeader><CardContent className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3"><p className="text-sm text-muted-foreground">Scheduled and recorded breaks for this student.</p><Button variant="outline" size="sm" onClick={() => { breakForm.reset({ studentId: detail.studentId, academicYearId: detail.targetYearId, batchId: detail.selectedBatchId ?? "", breakFrom: "", breakTo: "", reason: "", feeTreatment: "normal", feeTreatmentNotes: "" }); setBreakOpen(true); }} disabled={pending || !canManage}><CalendarOff />Create Break</Button></div>
      {studentBreaks.length === 0 ? <p className="text-sm text-muted-foreground">No enrollment breaks recorded.</p> : <div className="grid gap-3 sm:grid-cols-2">{studentBreaks.map((b) => <article key={b.breakId} className="rounded-2xl border bg-card p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{b.yearName} · {b.batchName}</p><p className="text-sm">{b.breakFrom} → {b.breakTo}</p></div><Badge className={breakStatusBadge[b.status]}>{b.status}</Badge></div><p className="mt-2 text-sm">{b.reason ?? "No reason provided"}</p><p className="text-xs text-muted-foreground">Fee treatment: {BREAK_FEE_TREATMENT_LABELS[b.feeTreatment]}{b.source === "rollover" ? " · Rollover" : ""}</p>{(b.status === "scheduled" || b.status === "active") ? <div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => { completeForm.reset({ breakId: b.breakId, actualResumptionDate: "" }); setCompletingBreak(b); }}>Complete</Button><Button size="sm" variant="ghost" onClick={() => run(cancelEnrollmentBreak({ breakId: b.breakId, reason: "Administrative cancellation" }), () => undefined)}>Cancel</Button></div> : null}</article>)}</div>}
    </CardContent></Card>

    <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}><DialogContent><DialogHeader><DialogTitle>Override Parent Batch Choice</DialogTitle><DialogDescription>Replacing the parent-selected batch records an audited change. A reason is mandatory.</DialogDescription></DialogHeader><form id="override-form" className="grid gap-4" noValidate onSubmit={overrideForm.handleSubmit((values) => run(adminOverrideRolloverBatch(values), setOverrideOpen))}>
      <Field label="New Batch" error={overrideForm.formState.errors.newBatchId?.message}><select className={controlClass} disabled={pending} {...overrideForm.register("newBatchId")}><option value="">Select Batch</option>{batches.map((b) => <option key={b.batchId} value={b.batchId} disabled={b.available != null && b.available < 1}>{b.batchName}{b.available != null ? ` · ${b.available} seats` : ""}</option>)}</select></Field>
      <Field label="Reason" error={overrideForm.formState.errors.reason?.message}><textarea className={`${controlClass} min-h-24 py-2`} disabled={pending} {...overrideForm.register("reason")} /></Field>
    </form><DialogFooter><Button variant="outline" onClick={() => setOverrideOpen(false)} disabled={pending}>Cancel</Button><Button type="submit" form="override-form" disabled={pending}>{pending ? "Saving…" : "Apply Override"}</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={finalizeOpen} onOpenChange={setFinalizeOpen}><DialogContent><DialogHeader><DialogTitle>Finalize Rollover</DialogTitle><DialogDescription>Create the {detail.targetYearName} assignment for {detail.studentName}. The current assignment is closed automatically.</DialogDescription></DialogHeader><form id="finalize-form" className="grid gap-4" noValidate onSubmit={finalizeForm.handleSubmit((values) => run(finalizeRollover({ requestId: detail.requestId, remarks: values.remarks || null }), setFinalizeOpen))}>
      <div className="rounded-xl bg-muted/60 p-3 text-sm"><p><span className="font-semibold">Student:</span> {detail.studentName} ({detail.admissionNo})</p><p><span className="font-semibold">Class:</span> {detail.proposedClassName}</p><p><span className="font-semibold">Batch:</span> {detail.selectedBatchName ?? "None selected"}</p><p><span className="font-semibold">Joining:</span> {detail.joiningType === "delayed" ? `Delayed — effective ${detail.expectedJoiningDate}` : "Normal — effective at year start"}</p></div>
      <Field label="Remarks (optional)"><textarea className={`${controlClass} min-h-20 py-2`} disabled={pending} {...finalizeForm.register("remarks")} /></Field>
    </form><DialogFooter><Button variant="outline" onClick={() => setFinalizeOpen(false)} disabled={pending}>Cancel</Button><Button type="submit" form="finalize-form" disabled={pending}>{pending ? "Finalizing…" : "Finalize"}</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={resolveOpen} onOpenChange={setResolveOpen}><DialogContent><DialogHeader><DialogTitle>Resolve Without Assignment</DialogTitle><DialogDescription>Mark this request as not continuing, or cancel it. No next-year assignment is created.</DialogDescription></DialogHeader><form id="resolve-form" className="grid gap-4" noValidate onSubmit={resolveForm.handleSubmit((values) => run(resolveRolloverRequest(values), setResolveOpen))}>
      <Field label="Resolution" error={resolveForm.formState.errors.adminStatus?.message}><select className={controlClass} disabled={pending} {...resolveForm.register("adminStatus")}><option value="rejected">Not Continuing</option><option value="cancelled">Cancelled</option></select></Field>
      <Field label="Notes" error={resolveForm.formState.errors.notes?.message}><textarea className={`${controlClass} min-h-24 py-2`} disabled={pending} {...resolveForm.register("notes")} /></Field>
    </form><DialogFooter><Button variant="outline" onClick={() => setResolveOpen(false)} disabled={pending}>Cancel</Button><Button type="submit" form="resolve-form" disabled={pending}>{pending ? "Saving…" : "Resolve"}</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={approveOpen} onOpenChange={setApproveOpen}><DialogContent><DialogHeader><DialogTitle>Approve for Finalization</DialogTitle><DialogDescription>Approve {detail.studentName}&apos;s continuation so the rollover can be finalized even before the parent confirms. A reason is mandatory.</DialogDescription></DialogHeader><form id="approve-form" className="grid gap-4" noValidate onSubmit={approveForm.handleSubmit((values) => run(approveRolloverRequest(values), setApproveOpen))}>
      <Field label="Reason" error={approveForm.formState.errors.notes?.message}><textarea className={`${controlClass} min-h-24 py-2`} disabled={pending} {...approveForm.register("notes")} /></Field>
    </form><DialogFooter><Button variant="outline" onClick={() => setApproveOpen(false)} disabled={pending}>Cancel</Button><Button type="submit" form="approve-form" disabled={pending}>{pending ? "Saving…" : "Approve"}</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={breakOpen} onOpenChange={setBreakOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>Create Enrollment Break</DialogTitle><DialogDescription>Record a scheduled absence for {detail.studentName}. Fee treatment is prepared for the fee engine.</DialogDescription></DialogHeader><form id="break-form" className="grid gap-4 sm:grid-cols-2" noValidate onSubmit={breakForm.handleSubmit((values) => run(createEnrollmentBreak(values), setBreakOpen))}>
      <Field label="Academic Year" error={breakForm.formState.errors.academicYearId?.message}><select className={controlClass} disabled={pending} {...breakForm.register("academicYearId")}>{breakOptions.academicYears.map((y) => <option key={y.id} value={y.id}>{y.label}</option>)}</select></Field>
      <Field label="Batch" error={breakForm.formState.errors.batchId?.message}><select className={controlClass} disabled={pending} {...breakForm.register("batchId")}><option value="">Select Batch</option>{breakOptions.batches.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}</select></Field>
      <Field label="Break From" error={breakForm.formState.errors.breakFrom?.message}><Input type="date" className={inputClass} disabled={pending} {...breakForm.register("breakFrom")} /></Field>
      <Field label="Break To" error={breakForm.formState.errors.breakTo?.message}><Input type="date" className={inputClass} disabled={pending} {...breakForm.register("breakTo")} /></Field>
      <Field label="Fee Treatment" error={breakForm.formState.errors.feeTreatment?.message}><select className={controlClass} disabled={pending} {...breakForm.register("feeTreatment")}>{Object.entries(BREAK_FEE_TREATMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
      <Field label="Fee Treatment Notes"><Input className={inputClass} disabled={pending} {...breakForm.register("feeTreatmentNotes")} /></Field>
      <div className="space-y-2 sm:col-span-2"><label className="text-sm font-semibold">Reason</label><textarea className={`${controlClass} min-h-20 py-2`} disabled={pending} {...breakForm.register("reason")} />{breakForm.formState.errors.reason?.message ? <p className="text-sm text-destructive">{breakForm.formState.errors.reason.message}</p> : null}</div>
    </form><DialogFooter><Button variant="outline" onClick={() => setBreakOpen(false)} disabled={pending}>Cancel</Button><Button type="submit" form="break-form" disabled={pending}>{pending ? "Saving…" : "Create Break"}</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={completingBreak != null} onOpenChange={(open) => { if (!open) setCompletingBreak(null); }}><DialogContent><DialogHeader><DialogTitle>Complete Enrollment Break</DialogTitle><DialogDescription>Record the actual resumption date. Leave blank to use the day after the break ends.</DialogDescription></DialogHeader><form id="complete-form" className="grid gap-4" noValidate onSubmit={completeForm.handleSubmit((values) => { if (!completingBreak) return; run(completeEnrollmentBreak({ breakId: completingBreak.breakId, actualResumptionDate: values.actualResumptionDate || null }), (open) => { if (!open) setCompletingBreak(null); }); })}>
      <Field label="Actual Resumption Date"><Input type="date" className={inputClass} disabled={pending} {...completeForm.register("actualResumptionDate")} /></Field>
    </form><DialogFooter><Button variant="outline" onClick={() => setCompletingBreak(null)} disabled={pending}>Cancel</Button><Button type="submit" form="complete-form" disabled={pending}>{pending ? "Saving…" : "Complete Break"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarOff, CheckCircle2, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/dashboard/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Toaster, toast } from "@/components/ui/toast";
import { cancelEnrollmentBreak, completeEnrollmentBreak, createEnrollmentBreak } from "@/features/rollover/actions/rollover-actions";
import { BREAK_FEE_TREATMENT_LABELS, type AdminEnrollmentBreak } from "@/features/rollover/types/rollover";
import { createBreakSchema, type CreateBreakValues } from "@/features/rollover/validations/rollover-schema";

const controlClass = "flex h-10 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35 disabled:opacity-50";
const inputClass = "flex h-10 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35 disabled:opacity-50";

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

export function EnrollmentBreaksManager({ breaks, options }: { breaks: AdminEnrollmentBreak[]; options: BreakOptions }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [completing, setCompleting] = useState<AdminEnrollmentBreak | null>(null);
  const form = useForm<CreateBreakValues>({ resolver: zodResolver(createBreakSchema), defaultValues: { studentId: "", academicYearId: "", batchId: "", breakFrom: "", breakTo: "", reason: "", feeTreatment: "normal", feeTreatmentNotes: "" } });
  const completeForm = useForm<{ actualResumptionDate: string }>({ defaultValues: { actualResumptionDate: "" } });

  function run(action: Promise<{ status: "success" | "error"; message: string }>, close: (open: boolean) => void) {
    startTransition(async () => {
      const result = await action;
      if (result.status === "error") {
        toast.add({ title: "Error", description: result.message, type: "error" });
        return;
      }
      close(false);
      toast.add({ title: "Success", description: result.message, type: "success" });
      router.refresh();
    });
  }

  return <div className="space-y-6"><Toaster /><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Enrollment Breaks</h2><p className="text-sm text-muted-foreground">Scheduled and recorded absences with fee treatment preparation.</p></div><Button onClick={() => { form.reset({ studentId: "", academicYearId: "", batchId: "", breakFrom: "", breakTo: "", reason: "", feeTreatment: "normal", feeTreatmentNotes: "" }); setOpen(true); }} disabled={pending}><Plus />Create Break</Button></div>
    <Card><CardContent>{breaks.length === 0 ? <EmptyState icon={CalendarOff} title="No enrollment breaks" description="Create a break to record a scheduled absence." compact /> : <div className="hidden lg:block"><Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Academic Year</TableHead><TableHead>Batch</TableHead><TableHead>Period</TableHead><TableHead>Status</TableHead><TableHead>Fee Treatment</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{breaks.map((b) => <TableRow key={b.breakId}><TableCell><p className="font-semibold">{b.studentName}</p><p className="text-xs text-muted-foreground">{b.admissionNo}</p></TableCell><TableCell>{b.yearName}</TableCell><TableCell>{b.batchName}</TableCell><TableCell><p>{b.breakFrom} → {b.breakTo}</p><p className="text-xs text-muted-foreground">{b.reason}</p></TableCell><TableCell><Badge className={breakStatusBadge[b.status]}>{b.status}</Badge></TableCell><TableCell>{BREAK_FEE_TREATMENT_LABELS[b.feeTreatment]}</TableCell><TableCell className="text-right">{(b.status === "scheduled" || b.status === "active") ? <div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => { completeForm.reset({ actualResumptionDate: "" }); setCompleting(b); }}><CheckCircle2 />Complete</Button><Button size="sm" variant="ghost" onClick={() => run(cancelEnrollmentBreak({ breakId: b.breakId, reason: "Administrative cancellation" }), () => undefined)}>Cancel</Button></div> : <span className="text-xs text-muted-foreground">{b.status === "completed" ? `Resumed ${b.actualResumptionDate ?? ""}` : b.cancelledReason ?? ""}</span>}</TableCell></TableRow>)}</TableBody></Table></div>}</CardContent></Card>
    {breaks.length > 0 ? <div className="grid gap-3 lg:hidden">{breaks.map((b) => <article key={b.breakId} className="rounded-2xl border bg-card p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="font-bold">{b.studentName}</p><p className="text-xs text-muted-foreground">{b.admissionNo} · {b.batchName}</p></div><Badge className={breakStatusBadge[b.status]}>{b.status}</Badge></div><p className="mt-2 text-sm">{b.breakFrom} → {b.breakTo}</p><p className="text-xs text-muted-foreground">{b.reason}</p>{(b.status === "scheduled" || b.status === "active") ? <div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => { completeForm.reset({ actualResumptionDate: "" }); setCompleting(b); }}>Complete</Button><Button size="sm" variant="ghost" onClick={() => run(cancelEnrollmentBreak({ breakId: b.breakId, reason: "Administrative cancellation" }), () => undefined)}>Cancel</Button></div> : null}</article>)}</div> : null}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>Create Enrollment Break</DialogTitle><DialogDescription>Record a scheduled absence for a student.</DialogDescription></DialogHeader><form id="break-form" className="grid gap-4 sm:grid-cols-2" noValidate onSubmit={form.handleSubmit((values) => run(createEnrollmentBreak(values), setOpen))}>
      <div className="space-y-2 sm:col-span-2"><label className="text-sm font-semibold">Student</label><select className={controlClass} disabled={pending} {...form.register("studentId")}><option value="">Select Student</option>{options.students.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>{form.formState.errors.studentId?.message ? <p className="text-sm text-destructive">{form.formState.errors.studentId.message}</p> : null}</div>
      <Field label="Academic Year" error={form.formState.errors.academicYearId?.message}><select className={controlClass} disabled={pending} {...form.register("academicYearId")}><option value="">Select Academic Year</option>{options.academicYears.map((y) => <option key={y.id} value={y.id}>{y.label}</option>)}</select></Field>
      <Field label="Batch" error={form.formState.errors.batchId?.message}><select className={controlClass} disabled={pending} {...form.register("batchId")}><option value="">Select Batch</option>{options.batches.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}</select></Field>
      <Field label="Break From" error={form.formState.errors.breakFrom?.message}><Input type="date" className={inputClass} disabled={pending} {...form.register("breakFrom")} /></Field>
      <Field label="Break To" error={form.formState.errors.breakTo?.message}><Input type="date" className={inputClass} disabled={pending} {...form.register("breakTo")} /></Field>
      <Field label="Fee Treatment" error={form.formState.errors.feeTreatment?.message}><select className={controlClass} disabled={pending} {...form.register("feeTreatment")}>{Object.entries(BREAK_FEE_TREATMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
      <Field label="Fee Treatment Notes"><Input className={inputClass} disabled={pending} {...form.register("feeTreatmentNotes")} /></Field>
      <div className="space-y-2 sm:col-span-2"><label className="text-sm font-semibold">Reason</label><textarea className={`${controlClass} min-h-20 py-2`} disabled={pending} {...form.register("reason")} />{form.formState.errors.reason?.message ? <p className="text-sm text-destructive">{form.formState.errors.reason.message}</p> : null}</div>
    </form><DialogFooter><Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button><Button type="submit" form="break-form" disabled={pending}>{pending ? "Saving…" : "Create Break"}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={completing != null} onOpenChange={(open) => { if (!open) setCompleting(null); }}><DialogContent><DialogHeader><DialogTitle>Complete Enrollment Break</DialogTitle><DialogDescription>Record the actual resumption date. Leave blank to use the day after the break ends.</DialogDescription></DialogHeader><form id="complete-form" className="grid gap-4" noValidate onSubmit={completeForm.handleSubmit((values) => { if (!completing) return; run(completeEnrollmentBreak({ breakId: completing.breakId, actualResumptionDate: values.actualResumptionDate || null }), (open) => { if (!open) setCompleting(null); }); })}>
      <Field label="Actual Resumption Date"><Input type="date" className={inputClass} disabled={pending} {...completeForm.register("actualResumptionDate")} /></Field>
    </form><DialogFooter><Button variant="outline" onClick={() => setCompleting(null)} disabled={pending}>Cancel</Button><Button type="submit" form="complete-form" disabled={pending}>{pending ? "Saving…" : "Complete Break"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
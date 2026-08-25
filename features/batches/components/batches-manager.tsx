"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarClock, Copy, Eye, MoreHorizontal, Pencil, Plus, Search, Trash2, Users, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";

import { EmptyState } from "@/components/dashboard/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Toaster, toast } from "@/components/ui/toast";
import { createBatch, deleteBatch, setBatchStatusAction, updateBatchTimetable } from "@/features/batches/actions/batch-actions";
import type { Batch, BatchActionResult, BatchFormOptions } from "@/features/batches/types/batch";
import { groupBatchesByWeekdays } from "@/features/batches/utils/weekday-groups";
import { batchSchema, batchTimetableSchema, type BatchFormValues, type BatchTimetableValues } from "@/features/batches/validations/batch-schema";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const selectClass = "h-10 w-full rounded-xl border bg-card px-3 text-sm";

function grouped(batch: { schedules: Batch["schedules"] }) {
  const groups = new Map<string, { days: number[]; startTime: string; endTime: string }>();
  batch.schedules.filter((s) => s.isActive).forEach((s) => {
    const key = `${s.startTime}-${s.endTime}`;
    const item = groups.get(key) ?? { days: [], startTime: s.startTime, endTime: s.endTime };
    item.days.push(s.dayOfWeek);
    groups.set(key, item);
  });
  return [...groups.values()];
}

function scheduleSummary(batch: Batch) {
  const rows = grouped(batch);
  return rows.length ? rows.map((g) => `${g.days.map((d) => DAYS[d - 1]).join(", ")} · ${g.startTime}–${g.endTime}`).join("; ") : "No recurring timetable";
}
function boardLabel(batch: Batch) { return batch.boardNames.length ? batch.boardNames.join(", ") : batch.boardName ?? "Not set"; }
function classLabel(batch: Batch) { return batch.classNames.length ? batch.classNames.join(", ") : batch.className ?? "Not set"; }
function today() { return new Date().toISOString().slice(0, 10); }

function ScheduleFields({ control, register, errors }: { control: ReturnType<typeof useForm<BatchFormValues>>["control"]; register: ReturnType<typeof useForm<BatchFormValues>>["register"]; errors: ReturnType<typeof useForm<BatchFormValues>>["formState"]["errors"] }) {
  const { fields, append, remove } = useFieldArray({ control, name: "schedules" });
  return <section className="space-y-3">
    <div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold">Class Schedule</h3><p className="text-xs text-muted-foreground">Choose weekdays and timings for this Academic Year.</p></div><Button type="button" variant="outline" size="sm" onClick={() => append({ days: [], startTime: "", endTime: "" })}><Plus />Add Schedule</Button></div>
    {fields.map((field, index) => <Card key={field.id}><CardContent className="space-y-4 p-4"><div className="flex justify-between"><strong>Schedule {index + 1}</strong>{fields.length > 1 && <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(index)} aria-label={`Remove schedule ${index + 1}`}><X /></Button>}</div>
      <Controller control={control} name={`schedules.${index}.days`} render={({ field: dayField }) => <div className="flex flex-wrap gap-2">{DAYS.map((day, dayIndex) => { const value = dayIndex + 1; const selected = dayField.value.includes(value); return <Button key={day} type="button" size="sm" variant={selected ? "default" : "outline"} onClick={() => dayField.onChange(selected ? dayField.value.filter((v) => v !== value) : [...dayField.value, value].sort())}>{day}{selected ? " ✓" : ""}</Button>; })}</div>} />
      <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm">Start Time<Input type="time" {...register(`schedules.${index}.startTime`)} /></label><label className="grid gap-1 text-sm">End Time<Input type="time" {...register(`schedules.${index}.endTime`)} /></label></div>
      {errors.schedules?.[index]?.days && <p className="text-sm text-destructive">{errors.schedules[index]?.days?.message}</p>}
      {errors.schedules?.[index]?.root && <p className="text-sm text-destructive">{errors.schedules[index]?.root?.message}</p>}
    </CardContent></Card>)}
  </section>;
}

function ConflictDialog({ result, pending, onCancel, onApprove }: { result: Extract<BatchActionResult, { status: "conflict" }> | null; pending: boolean; onCancel: () => void; onApprove: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return <Dialog open={Boolean(result)} onOpenChange={(open) => { if (!open && !pending) { setReason(""); onCancel(); } }}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Schedule overlap</DialogTitle><DialogDescription>This timing overlaps another active Batch. Change the timing or approve the overlap with a reason.</DialogDescription></DialogHeader><div className="space-y-2">{result?.conflicts.map((c, index) => <div key={`${c.scheduleId}-${index}`} className="rounded-xl border p-3 text-sm"><strong>{c.batchName}</strong><p>{DAYS[c.dayOfWeek - 1]} · {c.existingStartTime}–{c.existingEndTime}</p></div>)}</div><label className="grid gap-1 text-sm">Audit Reason<Input value={reason} onChange={(e) => setReason(e.target.value)} minLength={3} /></label><DialogFooter><Button variant="outline" onClick={onCancel}>Change Schedule</Button><Button disabled={pending || reason.trim().length < 3} onClick={() => onApprove(reason)}>{pending ? "Checking…" : "Approve Overlap"}</Button></DialogFooter></DialogContent></Dialog>;
}

function BatchFormDialog({ open, batch, copyFrom, options, presetYearId, onOpenChange }: { open: boolean; batch: Batch | null; copyFrom: Batch | null; options: BatchFormOptions; presetYearId: string; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [conflict, setConflict] = useState<Extract<BatchActionResult, { status: "conflict" }> | null>(null);
  const [payload, setPayload] = useState<BatchFormValues | BatchTimetableValues | null>(null);
  const isTimetableEdit = Boolean(batch);
  const source = copyFrom;
  const sourceYear = options.academicYears.find((y) => y.id === source?.academicYearId);
  const suggestedTarget = source ? options.academicYears.find((y) => sourceYear && y.startDate > sourceYear.startDate) ?? options.academicYears.find((y) => y.isCurrent) ?? options.academicYears[0] : options.academicYears.find((y) => y.id === presetYearId) ?? options.academicYears.find((y) => y.isCurrent) ?? options.academicYears[0];
  const initialSchedules = grouped(batch ?? source ?? { schedules: [] });
  const effectiveFrom = suggestedTarget ? (suggestedTarget.startDate > today() ? suggestedTarget.startDate : today()) : today();

  const createForm = useForm<BatchFormValues>({ resolver: zodResolver(batchSchema), defaultValues: { academicYearId: suggestedTarget?.id ?? "", branchId: source?.branchId ?? "", boardIds: source?.boardIds ?? [], classIds: source?.classIds ?? [], subjectId: source?.subjectId ?? "", name: source?.name ?? "", effectiveFrom, schedules: initialSchedules.length ? initialSchedules : [{ days: [], startTime: "", endTime: "" }], overlapReason: "" } });
  const timetableForm = useForm<BatchTimetableValues>({ resolver: zodResolver(batchTimetableSchema), defaultValues: { batchId: batch?.id ?? "", effectiveFrom: "", schedules: initialSchedules.length ? initialSchedules : [{ days: [], startTime: "", endTime: "" }], overlapReason: "" } });
  const form = isTimetableEdit ? timetableForm : createForm;

  const selectedYearId = createForm.watch("academicYearId");
  const selectedYear = options.academicYears.find((y) => y.id === selectedYearId);

  function changeYear(value: string) {
    createForm.setValue("academicYearId", value, { shouldValidate: true });
    const year = options.academicYears.find((y) => y.id === value);
    if (year) createForm.setValue("effectiveFrom", year.startDate > today() ? year.startDate : today());
  }

  const execute = (values: BatchFormValues | BatchTimetableValues, approve = false, overlapReason?: string) => start(async () => {
    const submitted = approve ? { ...values, overlapReason } : values;
    const result = isTimetableEdit ? await updateBatchTimetable(submitted, approve) : await createBatch(submitted, approve);
    if (result.status === "conflict") { setPayload(values); setConflict(result); return; }
    if (result.status === "error") { toast.add({ title: "Unable to save", description: result.message, type: "error" }); return; }
    setConflict(null); setPayload(null); onOpenChange(false); toast.add({ title: "Success", description: source ? "Batch copied to the selected Academic Year." : result.message, type: "success" }); router.refresh();
  });

  return <><Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>{isTimetableEdit ? "Change Batch Timetable" : source ? "Copy Batch to Academic Year" : "Add Batch"}</DialogTitle><DialogDescription>{isTimetableEdit ? "Changes apply prospectively and preserve historical timings." : source ? "Everything is pre-filled. Change the Academic Year, Batch Name, academic details, weekdays or timings before creating the copy." : "Academic Year is the primary context for every Batch."}</DialogDescription></DialogHeader>
    <form id="batch-form" onSubmit={form.handleSubmit((v) => { setPayload(v); execute(v); })} className="space-y-6">
      {!isTimetableEdit && <section className="space-y-3"><h3 className="font-semibold">Academic Details</h3><div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm sm:col-span-2">Academic Year<select className={selectClass} value={selectedYearId} onChange={(e) => changeYear(e.target.value)} required><option value="">Select Academic Year</option>{options.academicYears.map((item) => <option key={item.id} value={item.id}>{item.label}{item.isCurrent ? " (Current)" : ""}</option>)}</select>{createForm.formState.errors.academicYearId && <span className="text-destructive">{createForm.formState.errors.academicYearId.message}</span>}</label>
        <label className="grid gap-1 text-sm">Batch Name<Input autoFocus {...createForm.register("name")} />{createForm.formState.errors.name && <span className="text-destructive">{createForm.formState.errors.name.message}</span>}</label>
        <label className="grid gap-1 text-sm">Subject<select className={selectClass} {...createForm.register("subjectId")} required><option value="">Select</option>{options.subjects.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label className="grid gap-1 text-sm">Branch<select className={selectClass} {...createForm.register("branchId")}><option value="">Institute-wide</option>{options.branches.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label className="grid gap-1 text-sm">Effective From<Input type="date" min={selectedYear?.startDate} max={selectedYear?.endDate} {...createForm.register("effectiveFrom")} /></label>
        <div className="grid gap-2 sm:col-span-2"><span className="text-sm">Boards</span><Controller control={createForm.control} name="boardIds" render={({ field }) => <div className="grid gap-2 rounded-xl border p-3 sm:grid-cols-2">{options.boards.map((item) => { const selected = field.value.includes(item.id); return <label key={item.id} className="flex items-center gap-2"><input type="checkbox" checked={selected} onChange={() => field.onChange(selected ? field.value.filter((id) => id !== item.id) : [...field.value, item.id])} />{item.label}</label>; })}</div>} /></div>
        <div className="grid gap-2 sm:col-span-2"><span className="text-sm">Classes</span><Controller control={createForm.control} name="classIds" render={({ field }) => <div className="grid gap-2 rounded-xl border p-3 sm:grid-cols-2">{options.classes.map((item) => { const selected = field.value.includes(item.id); return <label key={item.id} className="flex items-center gap-2"><input type="checkbox" checked={selected} onChange={() => field.onChange(selected ? field.value.filter((id) => id !== item.id) : [...field.value, item.id])} />{item.label}</label>; })}</div>} /></div>
      </div></section>}
      {isTimetableEdit && <label className="grid gap-1 text-sm">Effective From<Input type="date" min={today()} {...timetableForm.register("effectiveFrom")} /></label>}
      <ScheduleFields control={form.control as never} register={form.register as never} errors={form.formState.errors as never} />
    </form>
    <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Cancel</Button><Button type="submit" form="batch-form" disabled={pending}>{pending ? "Checking…" : isTimetableEdit ? "Save Future Timetable" : source ? "Create Copied Batch" : "Create Batch"}</Button></DialogFooter>
  </DialogContent></Dialog><ConflictDialog result={conflict} pending={pending} onCancel={() => setConflict(null)} onApprove={(reason) => payload && execute(payload, true, reason)} /></>;
}

export function BatchesManager({ batches, options }: { batches: Batch[]; options: BatchFormOptions }) {
  const router = useRouter();
  const currentYearId = options.academicYears.find((y) => y.isCurrent)?.id ?? options.academicYears[0]?.id ?? "";
  const [academicYearId, setAcademicYearId] = useState(currentYearId);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Batch | null>(null);
  const [copying, setCopying] = useState<Batch | null>(null);
  const [viewing, setViewing] = useState<Batch | null>(null);
  const [deleting, setDeleting] = useState<Batch | null>(null);
  const [pending, start] = useTransition();

  const yearBatches = useMemo(() => batches.filter((b) => !academicYearId || b.academicYearId === academicYearId), [batches, academicYearId]);
  const filtered = useMemo(() => { const term = search.trim().toLowerCase(); return term ? yearBatches.filter((b) => [b.name, ...b.boardNames, b.boardName, ...b.classNames, b.className, b.subjectName].some((v) => v?.toLowerCase().includes(term))) : yearBatches; }, [yearBatches, search]);
  const weekdayGroups = useMemo(() => groupBatchesByWeekdays(filtered.map((batch) => ({ ...batch, weekdays: [...new Set(batch.schedules.filter((s) => s.isActive).map((s) => s.dayOfWeek))] }))), [filtered]);
  const selectedYear = options.academicYears.find((y) => y.id === academicYearId);

  function openCreate() { setEditing(null); setCopying(null); setOpen(true); }
  function openCopy(batch: Batch) { setEditing(null); setCopying(batch); setOpen(true); }
  function openEdit(batch: Batch) { setCopying(null); setEditing(batch); setOpen(true); }

  const actions = (batch: Batch) => <DropdownMenu><DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" aria-label={`Actions for ${batch.name}`} />}><MoreHorizontal /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setViewing(batch)}><Eye />View</DropdownMenuItem><DropdownMenuItem onClick={() => openCopy(batch)}><Copy />Copy to Another Academic Year</DropdownMenuItem>{batch.academicYearId && batch.subjectId && <DropdownMenuItem onClick={() => openEdit(batch)}><Pencil />Change Timetable</DropdownMenuItem>}<DropdownMenuItem onClick={() => start(async () => { const result = await setBatchStatusAction({ id: batch.id, isActive: !batch.isActive }); toast.add({ title: result.status === "success" ? "Success" : "Unable to update", description: result.message, type: result.status === "success" ? "success" : "error" }); if (result.status === "success") router.refresh(); })}>{batch.isActive ? "Set Inactive" : "Set Active"}</DropdownMenuItem><DropdownMenuItem variant="destructive" onClick={() => setDeleting(batch)}><Trash2 />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu>;

  return <><Toaster /><div className="space-y-6"><PageHeader title="Batches" description="View and manage Batches by Academic Year." icon={Users} theme="batches" eyebrow="Academic Setup" action={<Button onClick={openCreate}><Plus />Add Batch</Button>} />
    <div className="grid gap-4 md:grid-cols-2"><StatCard title="Batches in Selected Year" value={String(yearBatches.length)} description={selectedYear?.label ?? "Academic Year"} icon={Users} tone="blue" /><StatCard title="Scheduled Batches" value={String(yearBatches.filter((b) => b.schedules.some((s) => s.isActive)).length)} description="With recurring timetable" icon={CalendarClock} tone="emerald" /></div>
    <Card><CardContent className="space-y-4 p-4"><div className="grid gap-3 md:grid-cols-[minmax(220px,320px)_1fr]"><label className="grid gap-1 text-sm font-medium">Academic Year<select className={selectClass} value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)}>{options.academicYears.map((year) => <option key={year.id} value={year.id}>{year.label}{year.isCurrent ? " (Current)" : ""}</option>)}</select></label><label className="grid gap-1 text-sm font-medium">Search within {selectedYear?.label ?? "Academic Year"}<div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search Batch, Board, Class or Subject" value={search} onChange={(e) => setSearch(e.target.value)} /></div></label></div></CardContent></Card>
    {filtered.length === 0 ? <EmptyState icon={Users} title="No Batches in this Academic Year" description="Create a Batch or copy one from another Academic Year." /> : <div className="space-y-6">{weekdayGroups.map((group) => <Card key={group.key}><CardContent className="p-0"><div className="border-b bg-muted/40 px-4 py-3"><h2 className="font-semibold">{group.label}</h2></div><div className="hidden overflow-x-auto lg:block"><Table><TableHeader><TableRow><TableHead>Batch</TableHead><TableHead>Class</TableHead><TableHead>Board</TableHead><TableHead>Subject</TableHead><TableHead>Timetable</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{group.items.map((batch) => <TableRow key={`${group.key}-${batch.id}`}><TableCell className="font-medium">{batch.name}</TableCell><TableCell>{classLabel(batch)}</TableCell><TableCell>{boardLabel(batch)}</TableCell><TableCell>{batch.subjectName ?? "—"}</TableCell><TableCell>{scheduleSummary(batch)}</TableCell><TableCell><Badge variant="outline">{batch.isActive ? "Active" : "Inactive"}</Badge></TableCell><TableCell className="text-right">{actions(batch)}</TableCell></TableRow>)}</TableBody></Table></div><div className="grid gap-3 p-3 lg:hidden">{group.items.map((batch) => <div key={`${group.key}-${batch.id}`} className="rounded-xl border p-4"><div className="flex justify-between gap-3"><div><p className="font-semibold">{batch.name}</p><p className="text-xs text-muted-foreground">{classLabel(batch)} · {batch.subjectName ?? "No subject"}</p></div>{actions(batch)}</div><p className="mt-2 text-sm">{scheduleSummary(batch)}</p></div>)}</div></CardContent></Card>)}</div>}
  </div>
  <BatchFormDialog key={`${editing?.id ?? "new"}-${copying?.id ?? "none"}-${open}`} open={open} batch={editing} copyFrom={copying} options={options} presetYearId={academicYearId} onOpenChange={(value) => { setOpen(value); if (!value) { setEditing(null); setCopying(null); } }} />
  <Dialog open={Boolean(viewing)} onOpenChange={(value) => !value && setViewing(null)}><DialogContent><DialogHeader><DialogTitle>{viewing?.name}</DialogTitle><DialogDescription>{viewing?.academicYearName}</DialogDescription></DialogHeader>{viewing && <div className="grid gap-3 text-sm"><p><strong>Academic Year:</strong> {viewing.academicYearName}</p><p><strong>Classes:</strong> {classLabel(viewing)}</p><p><strong>Boards:</strong> {boardLabel(viewing)}</p><p><strong>Subject:</strong> {viewing.subjectName ?? "—"}</p><p><strong>Timetable:</strong> {scheduleSummary(viewing)}</p></div>}</DialogContent></Dialog>
  <Dialog open={Boolean(deleting)} onOpenChange={(value) => !value && setDeleting(null)}><DialogContent><DialogHeader><DialogTitle>Delete Batch?</DialogTitle><DialogDescription>This permanently deletes {deleting?.name}. Batches already used by student or planner records may be protected and cannot be deleted.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button><Button variant="destructive" disabled={pending} onClick={() => deleting && start(async () => { const result = await deleteBatch(deleting.id); toast.add({ title: result.status === "success" ? "Deleted" : "Unable to delete", description: result.message, type: result.status === "success" ? "success" : "error" }); if (result.status === "success") { setDeleting(null); router.refresh(); } })}>Delete Batch</Button></DialogFooter></Dialog>
  </>;
}

"use client";

import { CalendarCheck, CheckCircle2, Clock3, ListChecks, RotateCcw, Search, Umbrella, UserX } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Toaster, toast } from "@/components/ui/toast";
import { loadAttendance, saveAttendance } from "@/features/attendance/actions/attendance-actions";
import { AttendanceEditDialog } from "@/features/attendance/components/attendance-edit-dialog";
import { AttendanceRoster } from "@/features/attendance/components/attendance-roster";
import type { AttendanceOptions, AttendanceRecordState, AttendanceRosterEntry } from "@/features/attendance/types/attendance";
import { groupBatchesByWeekdays } from "@/features/batches/utils/weekday-groups";

const selectClassName = "h-10 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-50";
const today = new Date().toISOString().slice(0, 10);

export function AttendanceManager({ options }: { options: AttendanceOptions }) {
  const [attendanceDate, setAttendanceDate] = useState(today);
  const [academicYearId, setAcademicYearId] = useState(options.academicYears.find((year) => year.isCurrent)?.id ?? options.academicYears[0]?.id ?? "");
  const [batchId, setBatchId] = useState("");
  const [entries, setEntries] = useState<AttendanceRosterEntry[]>([]);
  const [recordState, setRecordState] = useState<AttendanceRecordState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AttendanceRosterEntry | null>(null);
  const [isPending, startTransition] = useTransition();
  const batchGroups = useMemo(() => groupBatchesByWeekdays(options.batches), [options.batches]);
  const filtered = useMemo(() => { const term = search.trim().toLowerCase(); return entries.filter((entry) => !term || entry.studentName.toLowerCase().includes(term) || entry.admissionNumber.toLowerCase().includes(term)); }, [entries, search]);
  const counts = useMemo(() => ({ Present: entries.filter((x) => x.status === "Present").length, Absent: entries.filter((x) => x.status === "Absent").length, Late: entries.filter((x) => x.status === "Late").length, Leave: entries.filter((x) => x.status === "Leave").length }), [entries]);

  function clearRoster() { setEntries([]); setRecordState(null); setMessage(null); setSearch(""); }
  function updateFilter(setter: (value: string) => void, value: string) { setter(value); clearRoster(); }
  function load() { startTransition(async () => { const result = await loadAttendance({ attendanceDate, academicYearId, batchId }); if (result.status === "error" || result.status === "empty") { clearRoster(); setMessage(result.message); toast.add({ title: result.status === "empty" ? "Empty roster" : "Unable to load", description: result.message, type: result.status === "empty" ? "info" : "error" }); return; } setEntries(result.entries); setRecordState(result.recordState); setMessage(result.message ?? null); }); }
  function refreshRoster() { startTransition(async () => { const result = await loadAttendance({ attendanceDate, academicYearId, batchId }); if (result.status === "loaded") { setEntries(result.entries); setRecordState(result.recordState); setMessage(result.message ?? null); } }); }
  function changeEntry(assignmentId: string, patch: Partial<Pick<AttendanceRosterEntry, "status" | "remarks">>) { setEntries((current) => current.map((entry) => entry.assignmentId === assignmentId ? { ...entry, ...patch } : entry)); }
  function save() { startTransition(async () => { const result = await saveAttendance({ attendanceDate, academicYearId, batchId, entries: entries.map(({ assignmentId, studentId, status, remarks }) => ({ assignmentId, studentId, status, remarks })) }); if (result.status !== "success") { toast.add({ title: result.status === "already_recorded" ? "Attendance exists" : "Unable to save", description: result.message, type: result.status === "already_recorded" ? "warning" : "error" }); if (result.status === "already_recorded") refreshRoster(); return; } toast.add({ title: "Attendance saved", description: result.message, type: "success" }); refreshRoster(); }); }

  return <><Toaster /><div className="space-y-6"><PageHeader title="Daily Attendance" description="Record daily attendance by batch." icon={CalendarCheck} theme="attendance" eyebrow="Academics" />
    <Card><CardContent className="p-4 sm:p-6"><div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto]"><div className="space-y-2"><label htmlFor="attendance-date" className="text-sm font-medium">Attendance Date</label><Input id="attendance-date" type="date" value={attendanceDate} onChange={(event) => updateFilter(setAttendanceDate, event.target.value)} /></div><div className="space-y-2"><label htmlFor="attendance-year" className="text-sm font-medium">Academic Year</label><select id="attendance-year" className={selectClassName} value={academicYearId} onChange={(event) => updateFilter(setAcademicYearId, event.target.value)}><option value="">Select Academic Year</option>{options.academicYears.map((year) => <option key={year.id} value={year.id}>{year.label}{year.isCurrent ? " (Current)" : ""}</option>)}</select></div><div className="space-y-2"><label htmlFor="attendance-batch" className="text-sm font-medium">Batch</label><select id="attendance-batch" className={selectClassName} value={batchId} onChange={(event) => updateFilter(setBatchId, event.target.value)}><option value="">Select Batch</option>{batchGroups.map((group) => <optgroup key={group.key} label={group.label}>{group.items.map((batch) => <option key={batch.id} value={batch.id}>{batch.label}</option>)}</optgroup>)}</select></div><div className="flex items-end"><Button className="w-full lg:w-auto" disabled={isPending || !attendanceDate || !academicYearId || !batchId} onClick={load}>{isPending ? "Loading…" : "Load Students"}</Button></div></div></CardContent></Card>
    {entries.length > 0 ? <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><StatCard title="Total Students" value={entries.length.toString()} description="Selected roster" icon={ListChecks} tone="blue" /><StatCard title="Present" value={counts.Present.toString()} description="Marked present" icon={CheckCircle2} tone="emerald" /><StatCard title="Absent" value={counts.Absent.toString()} description="Marked absent" icon={UserX} tone="rose" /><StatCard title="Late" value={counts.Late.toString()} description="Marked late" icon={Clock3} tone="amber" /><StatCard title="Leave" value={counts.Leave.toString()} description="Approved leave" icon={Umbrella} tone="violet" /></div><Card><CardContent className="space-y-5 p-4 sm:p-6">{message ? <div role="status" className={recordState === "inconsistent" ? "rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" : "rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"}><div className="flex flex-wrap items-center justify-between gap-3"><p className="font-medium">{message}</p>{recordState === "recorded" ? <div className="flex gap-2"><Badge>View Attendance</Badge><Badge variant="outline">Edit individual records below</Badge></div> : null}</div></div> : null}<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search Attendance roster" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Admission No. or Student…" className="pl-9" /></div>{recordState === "new" ? <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setEntries((current) => current.map((entry) => ({ ...entry, status: "Present" })))}><CheckCircle2 />Mark All Present</Button><Button variant="outline" onClick={() => setEntries((current) => current.map((entry) => ({ ...entry, status: "Present", remarks: "" })))}><RotateCcw />Reset</Button></div> : null}</div>{filtered.length ? <AttendanceRoster entries={filtered} editable={recordState === "new"} onEntryChange={changeEntry} onEdit={setEditing} /> : <EmptyState icon={Search} title="No matching Students" description="Try another Admission Number or Student Name." compact />}{recordState === "new" ? <div className="flex justify-end"><Button size="lg" disabled={isPending} onClick={save}>{isPending ? "Saving Attendance…" : "Save Attendance"}</Button></div> : null}</CardContent></Card></> : <EmptyState icon={CalendarCheck} title={message ?? "Select filters to load Students"} description={message ? "Choose another date, Academic Year, or Batch and try again." : "Choose an Attendance Date, Academic Year and Batch to begin."} />}
  </div><AttendanceEditDialog entry={editing} onClose={() => setEditing(null)} onSaved={refreshRoster} /></>;
}

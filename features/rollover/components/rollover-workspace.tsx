"use client";

import { CalendarClock, CheckCircle2, GraduationCap, RefreshCw, Search, Sparkles, Users } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/dashboard/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Toaster, toast } from "@/components/ui/toast";
import { generateRolloverWorkspace, setRolloverResponseDeadline } from "@/features/rollover/actions/rollover-actions";
import { ROLLOVER_ADMIN_STATUS_LABELS, ROLLOVER_RESPONSE_LABELS, type RolloverWorkspaceRow } from "@/features/rollover/types/rollover";
import { cn } from "@/lib/utils";

const controlClass = "h-10 rounded-xl border border-input bg-card px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35 disabled:opacity-50";

const statusBadge: Record<string, string> = {
  pending: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
  ready: "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200",
  approved: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  rejected: "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200",
  completed: "border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200",
  cancelled: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
};

const responseBadge: Record<string, string> = {
  pending: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
  continuing: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  not_continuing: "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200",
  undecided: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
};

interface YearOption {
  id: string;
  label: string;
  startDate: string;
  deadline: string | null;
}

export function RolloverWorkspace({ rows, years, initialSourceYearId, initialTargetYearId }: {
  rows: RolloverWorkspaceRow[];
  years: YearOption[];
  initialSourceYearId: string;
  initialTargetYearId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sourceYearId, setSourceYearId] = useState(initialSourceYearId);
  const [targetYearId, setTargetYearId] = useState(initialTargetYearId);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterResponse, setFilterResponse] = useState("All");
  const [deadline, setDeadline] = useState<string>(() => years.find((y) => y.id === targetYearId)?.deadline ?? "");
  const [deadlineDialog, setDeadlineDialog] = useState(false);

  const targetYear = years.find((y) => y.id === targetYearId);
  const filtered = useMemo(() => rows.filter((row) => {
    const term = search.trim().toLowerCase();
    return (filterStatus === "All" || row.adminStatus === filterStatus)
      && (filterResponse === "All" || row.parentResponse === filterResponse)
      && (!term || [row.studentName, row.admissionNo, row.proposedClassName, row.selectedBatchName ?? ""].some((value) => value.toLowerCase().includes(term)));
  }), [filterResponse, filterStatus, rows, search]);

  const counts = {
    total: rows.length,
    pending: rows.filter((r) => r.parentResponse === "pending" || r.parentResponse === "undecided").length,
    continuing: rows.filter((r) => r.parentResponse === "continuing").length,
    finalized: rows.filter((r) => r.adminStatus === "completed").length,
  };

  function onYearChange(target: string) {
    const newDeadline = years.find((y) => y.id === target)?.deadline ?? "";
    setDeadline(newDeadline);
  }

  function generate() {
    startTransition(async () => {
      const result = await generateRolloverWorkspace({ sourceYearId, targetYearId });
      if (result.status === "error") {
        toast.add({ title: "Error", description: result.message, type: "error" });
        return;
      }
      toast.add({ title: "Success", description: result.message, type: "success" });
      router.refresh();
    });
  }

  function saveDeadline() {
    startTransition(async () => {
      const result = await setRolloverResponseDeadline({ academicYearId: targetYearId, deadline: deadline || null });
      if (result.status === "error") {
        toast.add({ title: "Error", description: result.message, type: "error" });
        return;
      }
      setDeadlineDialog(false);
      toast.add({ title: "Success", description: result.message, type: "success" });
      router.refresh();
    });
  }

  return <div className="space-y-6"><Toaster /><PageHeader title="Academic Year Rollover" description="Generate continuation requests for the next Academic Year, review parent confirmations and finalize next-year assignments." icon={RefreshCw} theme="students" action={<Button size="lg" onClick={() => setDeadlineDialog(true)} disabled={pending}><CalendarClock />Response Deadline</Button>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard title="Requests" value={counts.total.toString()} description="Generated for the selected years" icon={Users} tone="blue" /><StatCard title="Awaiting Response" value={counts.pending.toString()} description="Pending or undecided" icon={Sparkles} tone="amber" /><StatCard title="Continuing" value={counts.continuing.toString()} description="Parents confirmed" icon={CheckCircle2} tone="emerald" /><StatCard title="Finalized" value={counts.finalized.toString()} description="Next-year assignment created" icon={GraduationCap} tone="violet" /></div>
    <Card><CardContent className="space-y-5 p-4 sm:p-6">
      <div className="grid gap-3 lg:grid-cols-[minmax(14rem,1fr)_minmax(14rem,1fr)_auto_minmax(16rem,1fr)]">
        <div className="space-y-1.5"><label className="text-xs font-semibold text-muted-foreground">Source Academic Year</label><select aria-label="Source Academic Year" className={controlClass} value={sourceYearId} onChange={(e) => setSourceYearId(e.target.value)}><option value="">Select Source Year</option>{years.map((y) => <option key={y.id} value={y.id}>{y.label}</option>)}</select></div>
        <div className="space-y-1.5"><label className="text-xs font-semibold text-muted-foreground">Target Academic Year</label><select aria-label="Target Academic Year" className={controlClass} value={targetYearId} onChange={(e) => { setTargetYearId(e.target.value); onYearChange(e.target.value); }}><option value="">Select Target Year</option>{years.map((y) => <option key={y.id} value={y.id}>{y.label}</option>)}</select></div>
        <div className="flex items-end"><Button onClick={generate} disabled={pending || !sourceYearId || !targetYearId || sourceYearId === targetYearId}><RefreshCw />Generate</Button></div>
        <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search rollover requests" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Student, Admission No, Class or Batch…" className="h-10 pl-9" /></div>
      </div>
      {targetYear?.deadline ? <p className="text-sm text-muted-foreground">Response deadline for <span className="font-semibold text-foreground">{targetYear.label}</span>: <span className="font-semibold text-foreground">{targetYear.deadline}</span></p> : null}
      <div className="flex flex-wrap gap-2">
        <select aria-label="Filter admin status" className={controlClass} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}><option>All</option>{Object.entries(ROLLOVER_ADMIN_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select aria-label="Filter parent response" className={controlClass} value={filterResponse} onChange={(e) => setFilterResponse(e.target.value)}><option>All</option>{Object.entries(ROLLOVER_RESPONSE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      </div>
      {rows.length === 0 ? <EmptyState icon={RefreshCw} title="No rollover requests yet" description="Select the Source and Target Academic Years, then click Generate to create continuation requests for current students." /> : filtered.length === 0 ? <EmptyState icon={Search} title="No matching requests" description="Try changing the search or filters." compact /> : <div className="hidden xl:block"><Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Proposed Class</TableHead><TableHead>Parent Response</TableHead><TableHead>Batch</TableHead><TableHead>Status</TableHead><TableHead>Deadline</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{filtered.map((row) => <TableRow key={row.requestId}><TableCell><p className="font-semibold">{row.studentName}</p><p className="text-xs text-muted-foreground">{row.admissionNo}</p></TableCell><TableCell>{row.proposedClassName}</TableCell><TableCell><Badge className={responseBadge[row.parentResponse]}>{ROLLOVER_RESPONSE_LABELS[row.parentResponse]}</Badge>{row.parentResponse === "continuing" && row.joiningType ? <p className="mt-1 text-xs text-muted-foreground">{row.joiningType === "delayed" ? "Delayed joining" : "Normal joining"}</p> : null}</TableCell><TableCell>{row.selectedBatchName ?? <span className="text-muted-foreground">Not selected</span>}</TableCell><TableCell><Badge className={statusBadge[row.adminStatus]}>{ROLLOVER_ADMIN_STATUS_LABELS[row.adminStatus]}</Badge></TableCell><TableCell>{row.responseDeadline ?? "—"}</TableCell><TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => router.push(`/students/rollover/${row.requestId}`)}>Manage</Button></TableCell></TableRow>)}</TableBody></Table></div>}
      {filtered.length > 0 ? <div className="grid gap-3 xl:hidden">{filtered.map((row) => <article key={row.requestId} className="rounded-2xl border bg-card p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="font-bold">{row.studentName}</p><p className="text-xs text-muted-foreground">{row.admissionNo} · {row.proposedClassName}</p></div><Button variant="outline" size="sm" onClick={() => router.push(`/students/rollover/${row.requestId}`)}>Manage</Button></div><div className="mt-3 flex flex-wrap items-center gap-2"><Badge className={responseBadge[row.parentResponse]}>{ROLLOVER_RESPONSE_LABELS[row.parentResponse]}</Badge><Badge className={cn(statusBadge[row.adminStatus])}>{ROLLOVER_ADMIN_STATUS_LABELS[row.adminStatus]}</Badge></div>{row.selectedBatchName ? <p className="mt-2 text-sm">Batch: <span className="font-semibold">{row.selectedBatchName}</span></p> : null}</article>)}</div> : null}
    </CardContent></Card>
    <Dialog open={deadlineDialog} onOpenChange={setDeadlineDialog}><DialogContent><DialogHeader><DialogTitle>Response Deadline</DialogTitle><DialogDescription>Set the optional date by which parents should confirm continuation for {targetYear?.label ?? "the target year"}. Existing requests for this year are updated.</DialogDescription></DialogHeader><div className="space-y-2"><label className="text-sm font-semibold">Deadline (optional)</label><Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div><DialogFooter><Button variant="outline" onClick={() => setDeadlineDialog(false)} disabled={pending}>Cancel</Button><Button onClick={saveDeadline} disabled={pending || !targetYearId}>{pending ? "Saving…" : "Save Deadline"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
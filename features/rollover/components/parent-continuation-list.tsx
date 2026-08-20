"use client";

import { ArrowRight, CalendarClock, GraduationCap, Lock, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/dashboard/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ROLLOVER_ADMIN_STATUS_LABELS, ROLLOVER_RESPONSE_LABELS, type ParentRolloverRequest } from "@/features/rollover/types/rollover";

const responseBadge: Record<string, string> = {
  pending: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
  continuing: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  not_continuing: "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200",
  undecided: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
};

const statusBadge: Record<string, string> = {
  pending: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
  ready: "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200",
  approved: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  rejected: "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200",
  completed: "border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200",
  cancelled: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
};

export function ParentContinuationList({ requests }: { requests: ParentRolloverRequest[] }) {
  const router = useRouter();
  if (requests.length === 0) {
    return <EmptyState icon={RefreshCw} title="No continuation requests" description="Your institute has not opened continuation for your children yet. You will be notified when a request is available." />;
  }
  return <div className="grid gap-4 lg:grid-cols-2">{requests.map((request) => {
    const active = !request.isLocked && !["completed", "cancelled", "rejected"].includes(request.adminStatus);
    const showFlow = request.parentResponse === "pending" || request.parentResponse === "undecided" || (request.parentResponse === "continuing" && !request.isLocked);
    return <Card key={request.requestId}><CardContent className="space-y-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div><h3 className="text-lg font-bold">{request.studentName}</h3><p className="text-sm text-muted-foreground">{request.admissionNo} · {request.proposedClassName}</p></div>
        <div className="flex flex-col items-end gap-2"><Badge className={responseBadge[request.parentResponse]}>{ROLLOVER_RESPONSE_LABELS[request.parentResponse]}</Badge><Badge className={statusBadge[request.adminStatus]}>{ROLLOVER_ADMIN_STATUS_LABELS[request.adminStatus]}</Badge></div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm"><GraduationCap className="size-4 text-muted-foreground" /><span className="font-semibold">{request.sourceYearName}</span><ArrowRight className="size-4 text-muted-foreground" /><span className="font-semibold">{request.targetYearName}</span></div>
      {request.isLocked ? <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"><Lock className="size-4" /><span>Confirmed and locked{request.selectedBatchName ? ` · ${request.selectedBatchName}` : ""}{request.expectedJoiningDate ? ` · joins ${request.expectedJoiningDate}` : ""}</span></div> : request.parentResponse === "continuing" ? <p className="text-sm text-muted-foreground">{request.joiningType === "delayed" ? `Delayed joining expected ${request.expectedJoiningDate}` : "Normal joining"}{request.selectedBatchName ? ` · Batch: ${request.selectedBatchName}` : " · Batch not selected yet"}</p> : request.parentResponse === "not_continuing" ? <p className="text-sm text-muted-foreground">You indicated you are not continuing.</p> : <p className="text-sm text-muted-foreground">Awaiting your response.</p>}
      {request.responseDeadline ? <div className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarClock className="size-4" />Respond by {request.responseDeadline}</div> : null}
      <div className="flex justify-end"><Button size="sm" disabled={!active} onClick={() => router.push(`/parent/continuation/${request.requestId}`)}>{request.isLocked ? "View" : showFlow ? "Continue Flow" : "View"}</Button></div>
    </CardContent></Card>;
  })}</div>;
}
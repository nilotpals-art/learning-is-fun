"use client";

import { ArrowRight, CalendarClock, CheckCircle2, GraduationCap, RefreshCw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/dashboard/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ROLLOVER_RESPONSE_LABELS, type ParentRolloverRequest } from "@/features/rollover/types/rollover";

const responseBadge: Record<string, string> = {
  pending: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
  continuing: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  not_continuing: "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200",
  undecided: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
};

export function ParentDashboard({ requests }: { requests: ParentRolloverRequest[] }) {
  const router = useRouter();
  const children = new Set(requests.map((r) => r.studentId));
  const pendingCount = requests.filter((r) => r.parentResponse === "pending" || r.parentResponse === "undecided").length;
  const confirmedCount = requests.filter((r) => r.isLocked).length;
  const finalizedCount = requests.filter((r) => r.adminStatus === "completed").length;
  const needsAttention = requests.filter((r) => (r.parentResponse === "pending" || r.parentResponse === "undecided") && !["completed", "cancelled", "rejected"].includes(r.adminStatus));

  return <div className="space-y-6"><PageHeader title="Parent Dashboard" description="Track academic continuation for the next Academic Year, view results and fees, and respond to rollover requests." icon={GraduationCap} theme="students" action={needsAttention.length > 0 ? <Button size="lg" onClick={() => router.push("/parent/continuation")}><ArrowRight />Respond Now</Button> : undefined} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard title="Linked Children" value={children.size.toString()} description="Across the current academic year" icon={GraduationCap} tone="blue" /><StatCard title="Awaiting Response" value={pendingCount.toString()} description="Continuation requests to answer" icon={Sparkles} tone="amber" /><StatCard title="Confirmed" value={confirmedCount.toString()} description="Choices locked" icon={CheckCircle2} tone="emerald" /><StatCard title="Finalized" value={finalizedCount.toString()} description="Next-year assignment created" icon={RefreshCw} tone="violet" /></div>
    <Card><CardContent className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Academic Continuation</h2><Button variant="outline" size="sm" onClick={() => router.push("/parent/continuation")}>All Requests<ArrowRight /></Button></div>
      {requests.length === 0 ? <EmptyState icon={CalendarClock} title="No continuation requests" description="Your institute has not opened continuation for your children yet." compact /> : <div className="grid gap-3 lg:grid-cols-2">{requests.slice(0, 4).map((request) => <article key={request.requestId} className="rounded-2xl border bg-card p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="font-bold">{request.studentName}</p><p className="text-xs text-muted-foreground">{request.admissionNo}</p></div><Badge className={responseBadge[request.parentResponse]}>{ROLLOVER_RESPONSE_LABELS[request.parentResponse]}</Badge></div><p className="mt-2 text-sm">{request.sourceYearName} → <span className="font-semibold">{request.targetYearName}</span> · {request.proposedClassName}</p>{request.isLocked && request.selectedBatchName ? <p className="mt-1 text-xs text-muted-foreground">Locked · {request.selectedBatchName}</p> : null}</article>)}</div>}
    </CardContent></Card>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Button variant="outline" className="h-auto flex-col items-start gap-1 p-5" onClick={() => router.push("/parent/continuation")}><span className="text-base font-semibold">Continuation</span><span className="text-xs font-normal text-muted-foreground">Respond to next-year requests</span></Button><Button variant="outline" className="h-auto flex-col items-start gap-1 p-5" onClick={() => router.push("/parent/results")}><span className="text-base font-semibold">Results</span><span className="text-xs font-normal text-muted-foreground">Published exam results</span></Button><Button variant="outline" className="h-auto flex-col items-start gap-1 p-5" onClick={() => router.push("/parent/fees")}><span className="text-base font-semibold">Fees</span><span className="text-xs font-normal text-muted-foreground">Fee dues and payments</span></Button><Button variant="outline" className="h-auto flex-col items-start gap-1 p-5" onClick={() => router.push("/logout")}><span className="text-base font-semibold">Sign out</span><span className="text-xs font-normal text-muted-foreground">End your session</span></Button></div>
  </div>;
}
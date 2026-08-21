"use client";

import Link from "next/link";
import { useState } from "react";
import { BellRing, CalendarDays, ChartNoAxesColumnIncreasing, ClipboardCheck, IndianRupee, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AttendanceSummary, ExamResultSummary, NotificationSummary, ParentChild, ScheduleEventSummary } from "@/features/parent/types/parent";
import { cn } from "@/lib/utils";

function ChildSelector({ items, value, onChange }: { items: ParentChild[]; value: string; onChange: (id: string) => void }) {
  const child = items.find((x) => x.studentId === value);
  return <div className="overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-500 p-[1px] shadow-xl shadow-violet-950/10"><div className="rounded-[calc(1.5rem-1px)] bg-white/92 p-5 backdrop-blur"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-400 text-white shadow"><Sparkles className="size-5" /></span><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-fuchsia-600">My Student</p><p className="text-xl font-black text-slate-900">{child?.studentName ?? "No linked student"}</p>{child ? <p className="mt-1 text-sm text-slate-500">{[child.admissionNo, child.className, child.batchName, child.academicYearName].filter(Boolean).join(" · ")}</p> : null}</div></div>{items.length > 1 ? <select className="h-11 rounded-xl border border-violet-200 bg-violet-50 px-3 text-sm font-semibold text-violet-800 outline-none ring-violet-300 focus:ring-2" value={value} onChange={(e) => onChange(e.target.value)}>{items.map((x) => <option key={x.studentId} value={x.studentId}>{x.studentName}</option>)}</select> : null}</div></div></div>;
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return <div className={cn("rounded-2xl border p-4 shadow-sm", tone)}><p className="text-2xl font-black">{value}</p><p className="text-xs font-semibold opacity-70">{label}</p></div>;
}

function AttendanceTrend({ data }: { data: AttendanceSummary["monthlyTrend"] }) {
  return data.length ? <div className="flex h-36 items-end gap-3 overflow-x-auto pt-4">{data.map((m) => <div key={m.month} className="flex min-w-12 flex-1 flex-col items-center gap-2"><div className="w-full rounded-t-xl bg-gradient-to-t from-emerald-500 to-teal-300 shadow-sm" style={{ height: `${Math.max(6, m.percentage)}%` }} title={`${m.percentage}%`} /><span className="text-[11px] font-semibold text-slate-500">{m.month}</span></div>)}</div> : <p className="text-sm text-slate-500">No attendance data yet.</p>;
}

function ResultBars({ rows }: { rows: ExamResultSummary[] }) {
  const date = rows[0]?.examDate;
  const latest = rows.filter((r) => r.examDate === date).slice(0, 8);
  return latest.length ? <div className="space-y-3">{latest.map((r, i) => <div key={`${r.examTitle}-${r.subjectName}-${i}`}><div className="mb-1 flex justify-between text-xs font-semibold text-slate-600"><span>{r.subjectName ?? r.examTitle}</span><span>{r.percentage.toFixed(1)}%</span></div><div className="h-2 rounded bg-violet-100"><div className="h-2 rounded bg-gradient-to-r from-violet-500 to-fuchsia-500" style={{ width: `${Math.max(0, Math.min(100, r.percentage))}%` }} /></div></div>)}</div> : <p className="text-sm text-slate-500">No published results yet.</p>;
}

const cardBase = "border-white/80 bg-white/88 shadow-lg shadow-slate-900/5 backdrop-blur";

export function ParentDashboardLite({ linkedChildren, attendanceByStudent, resultsByStudent, scheduleByStudent, notifications }: { linkedChildren: ParentChild[]; attendanceByStudent: Record<string, AttendanceSummary>; resultsByStudent: Record<string, ExamResultSummary[]>; scheduleByStudent: Record<string, ScheduleEventSummary[]>; notifications: NotificationSummary }) {
  const [id, setId] = useState(linkedChildren[0]?.studentId ?? "");
  const attendance = attendanceByStudent[id];
  const results = resultsByStudent[id] ?? [];
  const next = (scheduleByStudent[id] ?? [])[0];

  return <div className="space-y-6">
    <div className="flex flex-col gap-1"><p className="text-sm font-bold uppercase tracking-[0.18em] text-fuchsia-600">Parent Dashboard</p><h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Everything important, at a glance.</h1><p className="text-sm text-slate-500">Attendance, results, schedule, fees and updates for your child.</p></div>
    <ChildSelector items={linkedChildren} value={id} onChange={setId} />
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className={cn(cardBase, "overflow-hidden border-emerald-100")}><div className="h-1.5 bg-gradient-to-r from-emerald-400 to-teal-400" /><CardHeader><CardTitle className="flex items-center gap-2 text-emerald-800"><ClipboardCheck className="size-5" />Attendance</CardTitle></CardHeader><CardContent><div className="grid grid-cols-3 gap-3"><Stat label="Attendance" value={`${attendance?.percentage ?? 0}%`} tone="border-emerald-100 bg-emerald-50 text-emerald-800" /><Stat label="Present" value={attendance?.presentCount ?? 0} tone="border-sky-100 bg-sky-50 text-sky-800" /><Stat label="Absent" value={attendance?.absentCount ?? 0} tone="border-rose-100 bg-rose-50 text-rose-800" /></div>{attendance ? <AttendanceTrend data={attendance.monthlyTrend} /> : null}<Link className={buttonVariants({ variant: "outline", className: "mt-4 border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100" })} href="/parent/attendance">View Attendance</Link></CardContent></Card>
      <Card className={cn(cardBase, "overflow-hidden border-violet-100")}><div className="h-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500" /><CardHeader><CardTitle className="flex items-center gap-2 text-violet-800"><ChartNoAxesColumnIncreasing className="size-5" />Exam Results</CardTitle></CardHeader><CardContent><ResultBars rows={results} /><Link className={buttonVariants({ variant: "outline", className: "mt-4 border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100" })} href="/parent/results">View Results</Link></CardContent></Card>
      <Card className={cn(cardBase, "overflow-hidden border-amber-100")}><div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-400" /><CardHeader><CardTitle className="flex items-center gap-2 text-amber-800"><CalendarDays className="size-5" />Next Schedule</CardTitle></CardHeader><CardContent className="space-y-3">{next ? <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4"><p className="font-bold text-slate-900">{next.title}</p><p className="mt-1 text-sm text-slate-600">{next.eventDate} · {next.startTime ?? ""} {next.batchName ? `· ${next.batchName}` : ""}</p><p className="mt-1 text-xs font-semibold text-amber-700">{next.scheduleType}</p></div> : <p className="text-sm text-slate-500">No upcoming event found.</p>}<Link className={buttonVariants({ variant: "outline", className: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100" })} href="/parent/schedule">View Schedule</Link></CardContent></Card>
      <Card className={cn(cardBase, "overflow-hidden border-sky-100")}><div className="h-1.5 bg-gradient-to-r from-sky-400 to-indigo-400" /><CardHeader><CardTitle className="flex items-center gap-2 text-sky-800"><BellRing className="size-5" />Notifications {notifications.unreadCount ? `(${notifications.unreadCount} unread)` : ""}</CardTitle></CardHeader><CardContent className="space-y-3">{notifications.recent.length ? notifications.recent.map((n) => <div key={n.recipientId} className="rounded-2xl border border-sky-100 bg-sky-50/80 p-3"><p className="font-bold text-slate-900">{n.title}</p><p className="text-sm text-slate-600">{n.message}</p></div>) : <p className="text-sm text-slate-500">No recent notifications.</p>}</CardContent></Card>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Link href="/parent/attendance" className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800 shadow-sm transition-transform hover:-translate-y-0.5"><ClipboardCheck className="size-5" />Attendance</Link>
      <Link href="/parent/results" className="flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm font-bold text-violet-800 shadow-sm transition-transform hover:-translate-y-0.5"><ChartNoAxesColumnIncreasing className="size-5" />Results</Link>
      <Link href="/parent/fees" className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800 shadow-sm transition-transform hover:-translate-y-0.5"><IndianRupee className="size-5" />Fees</Link>
      <Link href="/parent/schedule" className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800 shadow-sm transition-transform hover:-translate-y-0.5"><CalendarDays className="size-5" />Schedule</Link>
    </div>
  </div>;
}

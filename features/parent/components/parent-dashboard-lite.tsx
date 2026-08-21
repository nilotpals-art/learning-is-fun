"use client";

import Link from "next/link";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AttendanceSummary, ExamResultSummary, NotificationSummary, ParentChild, ScheduleEventSummary } from "@/features/parent/types/parent";

function ChildSelector({ items, value, onChange }: { items: ParentChild[]; value: string; onChange: (id: string) => void }) {
  const child = items.find((x) => x.studentId === value);
  return <Card><CardContent className="p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Student</p><p className="font-semibold">{child?.studentName ?? "No linked student"}</p>{child ? <p className="text-sm text-muted-foreground">{[child.admissionNo, child.className, child.batchName, child.academicYearName].filter(Boolean).join(" · ")}</p> : null}</div>{items.length > 1 ? <select className="h-10 rounded-xl border bg-background px-3 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>{items.map((x) => <option key={x.studentId} value={x.studentId}>{x.studentName}</option>)}</select> : null}</div></CardContent></Card>;
}

function Stat({ label, value }: { label: string; value: string | number }) { return <div className="rounded-2xl border p-4"><p className="text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>; }

function AttendanceTrend({ data }: { data: AttendanceSummary["monthlyTrend"] }) { return data.length ? <div className="flex h-36 items-end gap-3 overflow-x-auto pt-4">{data.map((m) => <div key={m.month} className="flex min-w-12 flex-1 flex-col items-center gap-2"><div className="w-full rounded-t bg-primary/80" style={{ height: `${Math.max(6, m.percentage)}%` }} title={`${m.percentage}%`} /><span className="text-[11px] text-muted-foreground">{m.month}</span></div>)}</div> : <p className="text-sm text-muted-foreground">No attendance data yet.</p>; }

function ResultBars({ rows }: { rows: ExamResultSummary[] }) { const date = rows[0]?.examDate; const latest = rows.filter((r) => r.examDate === date).slice(0, 8); return latest.length ? <div className="space-y-3">{latest.map((r, i) => <div key={`${r.examTitle}-${r.subjectName}-${i}`}><div className="mb-1 flex justify-between text-xs"><span>{r.subjectName ?? r.examTitle}</span><span>{r.percentage.toFixed(1)}%</span></div><div className="h-2 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${Math.max(0, Math.min(100, r.percentage))}%` }} /></div></div>)}</div> : <p className="text-sm text-muted-foreground">No published results yet.</p>; }

export function ParentDashboardLite({ linkedChildren, attendanceByStudent, resultsByStudent, scheduleByStudent, notifications }: { linkedChildren: ParentChild[]; attendanceByStudent: Record<string, AttendanceSummary>; resultsByStudent: Record<string, ExamResultSummary[]>; scheduleByStudent: Record<string, ScheduleEventSummary[]>; notifications: NotificationSummary }) {
  const [id, setId] = useState(linkedChildren[0]?.studentId ?? "");
  const attendance = attendanceByStudent[id];
  const results = resultsByStudent[id] ?? [];
  const next = (scheduleByStudent[id] ?? [])[0];

  return <div className="space-y-6">
    <ChildSelector items={linkedChildren} value={id} onChange={setId} />
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Attendance</CardTitle></CardHeader><CardContent><div className="grid grid-cols-3 gap-3"><Stat label="Attendance" value={`${attendance?.percentage ?? 0}%`} /><Stat label="Present" value={attendance?.presentCount ?? 0} /><Stat label="Absent" value={attendance?.absentCount ?? 0} /></div>{attendance ? <AttendanceTrend data={attendance.monthlyTrend} /> : null}<Link className={buttonVariants({ variant: "outline", className: "mt-4" })} href="/parent/attendance">View Attendance</Link></CardContent></Card>
      <Card><CardHeader><CardTitle>Exam Results</CardTitle></CardHeader><CardContent><ResultBars rows={results} /><Link className={buttonVariants({ variant: "outline", className: "mt-4" })} href="/parent/results">View Results</Link></CardContent></Card>
      <Card><CardHeader><CardTitle>Next Schedule</CardTitle></CardHeader><CardContent className="space-y-3">{next ? <div><p className="font-semibold">{next.title}</p><p className="text-sm text-muted-foreground">{next.eventDate} · {next.startTime ?? ""} {next.batchName ? `· ${next.batchName}` : ""}</p><p className="text-xs text-muted-foreground">{next.scheduleType}</p></div> : <p className="text-sm text-muted-foreground">No upcoming event found.</p>}<Link className={buttonVariants({ variant: "outline" })} href="/parent/schedule">View Schedule</Link></CardContent></Card>
      <Card><CardHeader><CardTitle>Notifications {notifications.unreadCount ? `(${notifications.unreadCount} unread)` : ""}</CardTitle></CardHeader><CardContent className="space-y-3">{notifications.recent.length ? notifications.recent.map((n) => <div key={n.recipientId} className="rounded-xl border p-3"><p className="font-medium">{n.title}</p><p className="text-sm text-muted-foreground">{n.message}</p></div>) : <p className="text-sm text-muted-foreground">No recent notifications.</p>}</CardContent></Card>
    </div>
    <div className="flex flex-wrap gap-2">{[["Attendance", "/parent/attendance"], ["Results", "/parent/results"], ["Fees", "/parent/fees"], ["Schedule", "/parent/schedule"]].map(([title, href]) => <Link key={href} className={buttonVariants({ variant: "outline" })} href={href}>{title}</Link>)}</div>
  </div>;
}

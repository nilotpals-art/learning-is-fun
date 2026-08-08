"use client";

import { useMemo, useState } from "react";

import { AttendanceStatusBadge } from "@/features/attendance-reports/components/attendance-status-badge";
import type { StudentCalendarEntry } from "@/features/attendance-reports/types/attendance-report";
import { cn } from "@/lib/utils";

const dayClasses = { Present: "bg-emerald-100 text-emerald-900", Absent: "bg-rose-100 text-rose-900", Late: "bg-amber-100 text-amber-900", Leave: "bg-blue-100 text-blue-900" } as const;

export function AttendanceCalendar({ entries }: { entries: StudentCalendarEntry[] }) {
  const months = useMemo(() => [...new Set(entries.map((entry) => entry.date.slice(0, 7)))].sort().reverse(), [entries]);
  const [selectedMonth, setSelectedMonth] = useState(months[0] ?? "");
  const records = useMemo(() => new Map(entries.filter((x) => x.date.startsWith(selectedMonth)).map((x) => [Number(x.date.slice(8, 10)), x])), [entries, selectedMonth]);
  if (!selectedMonth) return <p className="text-sm text-muted-foreground">No recorded Attendance is available for the calendar.</p>;
  const [year, month] = selectedMonth.split("-").map(Number);
  const days = new Date(year, month, 0).getDate();
  const offset = new Date(year, month - 1, 1).getDay();
  return <div className="space-y-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h3 className="text-lg font-bold text-emerald-950 dark:text-emerald-100">Monthly Attendance Calendar</h3><select aria-label="Calendar month" className="h-9 rounded-xl border bg-card px-3 text-sm" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>{months.map((item) => <option key={item} value={item}>{new Date(`${item}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</option>)}</select></div><div className="flex flex-wrap gap-2">{(["Present", "Absent", "Late", "Leave"] as const).map((status) => <AttendanceStatusBadge key={status} status={status} />)}</div><div className="grid grid-cols-7 gap-1 text-center text-xs"><div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>{Array.from({ length: offset }, (_, index) => <span key={`empty-${index}`} />)}{Array.from({ length: days }, (_, index) => { const day = index + 1; const record = records.get(day); return <div key={day} title={record ? `${record.status}${record.remarks ? `: ${record.remarks}` : ""}` : "No Attendance record"} className={cn("flex min-h-12 flex-col items-center justify-center rounded-xl border text-sm font-semibold", record ? dayClasses[record.status] : "bg-muted/30 text-muted-foreground")}>{day}{record ? <span className="mt-0.5 text-[9px] uppercase">{record.status}</span> : null}</div>; })}</div></div>;
}

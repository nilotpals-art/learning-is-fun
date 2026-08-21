import Link from "next/link";
import {
  Bell,
  BookOpenCheck,
  CalendarDays,
  ChartNoAxesCombined,
  CheckCircle2,
  Clock3,
  Quote,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  StudentDashboardData,
  StudentDashboardEvent,
} from "@/features/student-dashboard/types/student-dashboard";
import { ResultIndicatorBadge } from "@/features/learning-planner/components/result-indicator-badge";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", weekday: "short" }).format(new Date(`${value}T00:00:00`));
const formatPercentage = (value: number | null) => value === null ? "—" : `${value.toFixed(1)}%`;
const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());

function EventRow({ event }: { event: StudentDashboardEvent }) {
  return (
    <article className="rounded-2xl border border-border/70 bg-background/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{event.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(event.eventDate)} · {event.startTime ?? "All day"}{event.endTime ? `–${event.endTime}` : ""}
          </p>
        </div>
        <Badge variant={event.status === "cancelled" ? "destructive" : event.status === "rescheduled" ? "secondary" : "outline"}>
          {label(event.status)}
        </Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {[event.subjectName, label(event.scheduleType), event.batchName].filter(Boolean).join(" · ")}
      </p>
    </article>
  );
}

export function StudentDashboard({ data }: { data: StudentDashboardData }) {
  const context = [data.student.boardName, data.student.className, data.student.batchName].filter(Boolean).join(" · ");
  const practiceAction = data.practice.actionableItem?.status === "in_progress" ? "Continue Practice Work" : data.practice.actionableItem?.status === "assigned" ? "Start Practice Work" : "Review Completed Practice";
  const attendance = data.attendance;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 p-6 text-white shadow-xl sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-100">Student Dashboard</p>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Hello, {data.student.name.split(" ")[0]}</h1>
        <p className="mt-2 text-indigo-50">Ready for today&apos;s English practice?</p>
        <div className="mt-5 flex flex-wrap gap-2 text-sm">
          {context ? <span className="rounded-full bg-white/15 px-3 py-1.5">{context}</span> : null}
          {data.student.academicYearName ? <span className="rounded-full bg-white/15 px-3 py-1.5">Academic Year {data.student.academicYearName}</span> : null}
        </div>
      </section>

      <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 dark:border-amber-900/60 dark:from-amber-950/30 dark:to-orange-950/30">
        <CardContent className="flex gap-4 p-6">
          <Quote className="mt-1 size-7 shrink-0 text-amber-600" aria-hidden="true" />
          <figure>
            <blockquote className="text-lg font-medium leading-relaxed">“{data.quote.text}”</blockquote>
            <figcaption className="mt-2 text-sm text-muted-foreground">— {data.quote.author}</figcaption>
          </figure>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2"><CalendarDays className="size-5 text-blue-600" />Today&apos;s Learning</CardTitle>
            <Badge variant="secondary">{data.todaysEvents.length} events</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.nextEvent ? <div className="rounded-2xl bg-blue-50 p-4 dark:bg-blue-950/30"><p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Next Class</p><p className="mt-1 font-bold">{data.nextEvent.title}</p></div> : null}
            {data.todaysEvents.length ? data.todaysEvents.map((event) => <EventRow key={event.id} event={event} />) : <p className="rounded-2xl bg-muted/40 p-6 text-center text-sm text-muted-foreground">No learning events are scheduled for today.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><BookOpenCheck className="size-5 text-violet-600" />Practice Work</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-amber-50 p-3 dark:bg-amber-950/30"><p className="text-2xl font-bold">{data.practice.pending}</p><p className="text-xs text-muted-foreground">Pending</p></div>
              <div className="rounded-2xl bg-blue-50 p-3 dark:bg-blue-950/30"><p className="text-2xl font-bold">{data.practice.inProgress}</p><p className="text-xs text-muted-foreground">In progress</p></div>
              <div className="rounded-2xl bg-emerald-50 p-3 dark:bg-emerald-950/30"><p className="text-2xl font-bold">{data.practice.completed}</p><p className="text-xs text-muted-foreground">Completed</p></div>
            </div>
            {data.practice.actionableItem ? <div className="rounded-2xl border p-4"><p className="font-semibold">{data.practice.actionableItem.title}</p><p className="mt-1 text-sm text-muted-foreground">{[data.practice.actionableItem.skill, data.practice.actionableItem.topic].filter(Boolean).join(" · ") || "English Practice"}</p>{data.practice.overdue ? <Badge className="mt-3" variant="destructive">{data.practice.overdue} overdue</Badge> : data.practice.dueSoon ? <Badge className="mt-3" variant="secondary">{data.practice.dueSoon} due soon</Badge> : null}</div> : <p className="rounded-2xl bg-muted/40 p-6 text-center text-sm text-muted-foreground">You&apos;re all caught up — no Practice Work is waiting.</p>}
            <Button nativeButton={false} render={<Link href="/practice-work/my-work" />} className="w-full">{data.practice.actionableItem ? practiceAction : "Open My Practice Work"}</Button>
          </CardContent>
        </Card>
      </div>

      {data.recentResults.length ? <Card><CardHeader className="flex-row items-center justify-between"><CardTitle>Recent Results</CardTitle><Button nativeButton={false} variant="outline" render={<Link href="/student/results"/>}>View All</Button></CardHeader><CardContent className="grid gap-3 md:grid-cols-3">{data.recentResults.slice(0,3).map(result=><article key={result.resultSetId} className="rounded-2xl border p-4"><p className="font-semibold">{result.title}</p><p className="mt-1 text-sm text-muted-foreground">{result.examDate} · {result.subjectName??"Subject"}</p><p className="my-3 text-xl font-bold">{result.marksObtained} / {result.maxMarks}</p><ResultIndicatorBadge value={result.resultIndicator}/></article>)}</CardContent></Card>:null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="size-5 text-emerald-600" />My Attendance</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {attendance ? <><div><div className="flex items-end justify-between"><span className="text-4xl font-bold">{formatPercentage(attendance.attendancePercentage)}</span><span className="text-sm text-muted-foreground">{attendance.totalCount} records</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, attendance.attendancePercentage ?? 0)}%` }} /></div></div><dl className="grid grid-cols-3 gap-2 text-center sm:grid-cols-6">{[["Present", attendance.presentCount], ["Late", attendance.lateCount], ["Effective", attendance.effectivePresentCount], ["Absent", attendance.absentCount], ["Leave", attendance.leaveCount], ["Total", attendance.totalCount]].map(([name, value]) => <div key={name} className="rounded-xl bg-muted/40 p-2"><dd className="font-bold">{value}</dd><dt className="text-xs text-muted-foreground">{name}</dt></div>)}</dl></> : <p className="rounded-2xl bg-muted/40 p-6 text-center text-sm text-muted-foreground">Attendance will appear after your first recorded class.</p>}
            <Button nativeButton={false} variant="outline" render={<Link href="/student/attendance" />} className="w-full">View My Attendance</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ChartNoAxesCombined className="size-5 text-fuchsia-600" />My Progress</CardTitle></CardHeader>
          <CardContent>
            {data.progress.submittedAttempts >= 2 ? <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-fuchsia-50 p-4 dark:bg-fuchsia-950/30"><p className="text-sm text-muted-foreground">Average</p><p className="text-3xl font-bold">{formatPercentage(data.progress.averagePercentage)}</p></div><div className="rounded-2xl bg-violet-50 p-4 dark:bg-violet-950/30"><p className="text-sm text-muted-foreground">Latest</p><p className="text-3xl font-bold">{formatPercentage(data.progress.latestPercentage)}</p></div><p className="sm:col-span-2 text-sm text-muted-foreground">{data.progress.completedSets} completed Practice Sets · {data.progress.submittedAttempts} submitted attempts{data.progress.retryImprovement !== null ? ` · ${data.progress.retryImprovement >= 0 ? "+" : ""}${data.progress.retryImprovement.toFixed(1)}% average retry change` : ""}</p></div> : <div className="rounded-2xl bg-muted/40 p-6 text-center"><Sparkles className="mx-auto size-7 text-fuchsia-500" /><p className="mt-3 text-sm text-muted-foreground">Complete more Practice Work to see your learning trends here.</p></div>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="size-5 text-cyan-600" />Upcoming</CardTitle></CardHeader><CardContent className="space-y-3">{data.upcomingEvents.length ? data.upcomingEvents.map((event) => <EventRow key={event.id} event={event} />) : <p className="rounded-2xl bg-muted/40 p-6 text-center text-sm text-muted-foreground">No upcoming events in the next 14 days.</p>}</CardContent></Card>
        <Card><CardHeader className="flex-row items-center justify-between space-y-0"><CardTitle className="flex items-center gap-2"><Bell className="size-5 text-orange-600" />Notifications</CardTitle><Badge>{data.unreadNotifications} unread</Badge></CardHeader><CardContent className="space-y-3">{data.notifications.length ? data.notifications.map((item) => <article key={item.recipientId} className="rounded-2xl border p-4"><div className="flex items-start justify-between gap-2"><p className={item.readAt ? "font-medium" : "font-bold"}>{item.title}</p><Badge variant="outline">{label(item.priority)}</Badge></div><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.message}</p></article>) : <p className="rounded-2xl bg-muted/40 p-6 text-center text-sm text-muted-foreground">You have no notifications.</p>}<Button nativeButton={false} variant="outline" render={<Link href="/student/notifications" />} className="w-full">View Notifications</Button></CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[{ href: "/practice-work/my-work", title: "My Practice Work", icon: BookOpenCheck }, { href: "/student/schedule", title: "My Schedule", icon: CalendarDays }, { href: "/student/attendance", title: "My Attendance", icon: CheckCircle2 }, { href: "/student/notifications", title: "Notifications", icon: Bell }].map((item) => <Button key={item.href} nativeButton={false} variant="outline" size="lg" render={<Link href={item.href} />} className="h-14 justify-start"><item.icon />{item.title}</Button>)}</CardContent></Card>
    </div>
  );
}

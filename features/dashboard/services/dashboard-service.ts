import "server-only";

import type { AuthProfile } from "@/features/auth/types/auth";
import type {
  AdministratorDashboardData,
  DashboardActivity,
} from "@/features/dashboard/types/dashboard";
import { listScheduleEvents } from "@/features/learning-planner/services/event-service";
import { createClient } from "@/lib/supabase/server";

interface AttendanceActivityRow {
  id: string;
  attendance_date: string;
  status: string;
  updated_at: string;
  student: { name: string } | { name: string }[] | null;
}

interface ScheduleActivityRow {
  id: string;
  change_type: string;
  changed_at: string;
  event: { title: string } | { title: string }[] | null;
}

interface PracticeActivityRow {
  id: string;
  status: string;
  submitted_at: string | null;
  started_at: string;
  assignment:
    | { set: { title: string } | { title: string }[] | null; student: { name: string } | { name: string }[] | null }
    | { set: { title: string } | { title: string }[] | null; student: { name: string } | { name: string }[] | null }[]
    | null;
}

interface FeeActivityRow {
  id: string;
  receipt_no: string;
  status: string;
  amount: number;
  created_at: string;
  student: { name: string } | { name: string }[] | null;
}

const one = <T>(value: T | T[] | null): T | null =>
  !value ? null : Array.isArray(value) ? value[0] ?? null : value;

function instituteId(profile: AuthProfile): string {
  if (!profile.instituteId) throw new Error("DASHBOARD_UNAUTHORIZED");
  return profile.instituteId;
}

function indiaDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export async function getAdministratorDashboard(
  profile: AuthProfile
): Promise<AdministratorDashboardData> {
  const scope = instituteId(profile);
  const supabase = await createClient();
  const today = indiaDate();
  const rangeEnd = new Date();
  rangeEnd.setDate(rangeEnd.getDate() + 14);

  const [
    students,
    attendance,
    pendingPractice,
    feeSummary,
    events,
    recentStudents,
    recentAttendance,
    recentSchedule,
    recentPractice,
    recentFees,
  ] = await Promise.all([
    supabase.from("students").select("id", { count: "exact", head: true }).eq("institute_id", scope).eq("status", "Active"),
    supabase.from("student_attendance").select("status").eq("institute_id", scope).eq("attendance_date", today),
    supabase.from("practice_assignments").select("id", { count: "exact", head: true }).eq("institute_id", scope).in("status", ["assigned", "in_progress"]),
    supabase.rpc("fee_dashboard_summary"),
    listScheduleEvents(profile, { dateFrom: today, dateTo: indiaDate(rangeEnd) }),
    supabase.from("students").select("id,name,created_at").eq("institute_id", scope).order("created_at", { ascending: false }).limit(4),
    supabase.from("student_attendance").select("id,attendance_date,status,updated_at,student:students!student_attendance_student_id_fkey(name)").eq("institute_id", scope).order("updated_at", { ascending: false }).limit(4),
    supabase.from("schedule_changes").select("id,change_type,changed_at,event:schedule_events!schedule_changes_event_fkey!inner(id,institute_id,title,event_date)").eq("event.institute_id", scope).order("changed_at", { ascending: false }).limit(4),
    supabase.from("practice_attempts").select("id,status,submitted_at,started_at,assignment:practice_assignments!practice_attempts_assignment_fkey(set:practice_sets(title),student:students(name))").eq("institute_id", scope).in("status", ["submitted", "reviewed"]).order("submitted_at", { ascending: false, nullsFirst: false }).limit(4),
    supabase.from("fee_payments").select("id,receipt_no,status,amount,created_at,student:students(name)").eq("institute_id", scope).order("created_at", { ascending: false }).limit(4),
  ]);

  const queryError = students.error ?? attendance.error ?? pendingPractice.error ?? feeSummary.error ?? recentStudents.error ?? recentAttendance.error ?? recentSchedule.error ?? recentPractice.error ?? recentFees.error;
  if (queryError) throw queryError;

  const activities: DashboardActivity[] = [];
  (recentStudents.data ?? []).forEach((student) => activities.push({
    id: `student-${student.id}`,
    type: "student",
    title: "Student profile added",
    context: student.name,
    occurredAt: student.created_at,
    href: "/students",
  }));
  ((recentAttendance.data ?? []) as unknown as AttendanceActivityRow[]).forEach((record) => activities.push({
    id: `attendance-${record.id}`,
    type: "attendance",
    title: "Attendance recorded",
    context: `${one(record.student)?.name ?? "Student"} · ${record.status} · ${record.attendance_date}`,
    occurredAt: record.updated_at,
    href: "/attendance/history",
  }));
  ((recentSchedule.data ?? []) as unknown as ScheduleActivityRow[]).forEach((change) => activities.push({
    id: `planner-${change.id}`,
    type: "planner",
    title: `Schedule ${change.change_type.replaceAll("_", " ")}`,
    context: one(change.event)?.title ?? "Learning Planner event",
    occurredAt: change.changed_at,
    href: "/learning-planner/history",
  }));
  ((recentPractice.data ?? []) as unknown as PracticeActivityRow[]).forEach((attempt) => {
    const assignment = one(attempt.assignment);
    activities.push({
      id: `practice-${attempt.id}`,
      type: "practice",
      title: "Practice attempt submitted",
      context: `${one(assignment?.student ?? null)?.name ?? "Student"} · ${one(assignment?.set ?? null)?.title ?? "Practice Work"}`,
      occurredAt: attempt.submitted_at ?? attempt.started_at,
      href: "/practice-work/attempts",
    });
  });
  ((recentFees.data ?? []) as unknown as FeeActivityRow[]).forEach((payment) => activities.push({
    id: `fees-${payment.id}`,
    type: "fees",
    title: payment.status === "reversed" ? "Fee payment reversed" : "Fee payment posted",
    context: `${one(payment.student)?.name ?? "Student"} · ${payment.receipt_no}`,
    occurredAt: payment.created_at,
    href: `/fees/receipts/${payment.id}`,
  }));

  const attendanceRows = attendance.data ?? [];
  const effectivePresent = attendanceRows.filter((row) => row.status === "Present" || row.status === "Late").length;
  const todayEvents = events.filter((event) => event.eventDate === today && event.status !== "cancelled");

  return {
    activeStudents: students.count ?? 0,
    attendanceToday: {
      total: attendanceRows.length,
      effectivePresent,
      percentage: attendanceRows.length ? Math.round((effectivePresent * 1000) / attendanceRows.length) / 10 : null,
    },
    classesToday: todayEvents.length,
    pendingPractice: pendingPractice.count ?? 0,
    feeSummary: {
      totalOutstanding: Number((feeSummary.data as { totalOutstanding?: number } | null)?.totalOutstanding ?? 0),
      collectionsToday: Number((feeSummary.data as { collectionsToday?: number } | null)?.collectionsToday ?? 0),
    },
    upcomingEvents: events.filter((event) => event.eventDate >= today).slice(0, 6).map((event) => ({
      id: event.id,
      title: event.title,
      eventDate: event.eventDate,
      startTime: event.startTime,
      status: event.status,
      batchName: event.batchName,
    })),
    recentActivity: activities.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)).slice(0, 8),
  };
}

import "server-only";

import type { AuthProfile } from "@/features/auth/types/auth";
import type { AttendanceTotals } from "@/features/attendance-reports/types/attendance-report";
import { listScheduleEvents } from "@/features/learning-planner/services/event-service";
import { getHolidayCalendar } from "@/features/learning-planner/services/holiday-service";
import { listPlannerNotifications } from "@/features/learning-planner/services/notification-service";
import { listPublishedResults } from "@/features/learning-planner/services/exam-result-service";
import type { ScheduleEvent } from "@/features/learning-planner/types/learning-planner";
import { getStudentQuote } from "@/features/student-dashboard/services/quote-service";
import type {
  StudentDashboardData,
  StudentDashboardEvent,
  StudentDashboardIdentity,
  StudentHoliday,
  StudentPracticeProgress,
  StudentPracticeSummary,
} from "@/features/student-dashboard/types/student-dashboard";
import { createClient } from "@/lib/supabase/server";

interface StudentRow { id: string; name: string }
interface AssignmentRow {
  academic_year_id: string;
  batch_id: string;
  academic_year: { name: string } | { name: string }[];
  batch: { name: string } | { name: string }[];
  board: { name: string } | { name: string }[];
  academic_class: { class_name: string } | { class_name: string }[];
}
interface PracticeAssignmentRow {
  id: string;
  status: "assigned" | "in_progress" | "completed" | "closed";
  due_at: string | null;
  set: { title: string; skill: string | null; topic: string | null } | { title: string; skill: string | null; topic: string | null }[];
}
interface AttemptRow {
  practice_assignment_id: string;
  attempt_no: number;
  submitted_at: string | null;
  score_obtained: number | null;
  max_marks: number;
  percentage: number | null;
}

const one = <T>(value: T | T[] | null): T | null =>
  !value ? null : Array.isArray(value) ? value[0] ?? null : value;

function dateValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toDashboardEvent(event: ScheduleEvent): StudentDashboardEvent {
  return {
    id: event.id,
    title: event.title,
    subjectName: event.subjectName,
    batchName: event.batchName,
    eventDate: event.eventDate,
    startTime: event.startTime,
    endTime: event.endTime,
    scheduleType: event.scheduleType,
    status: event.status,
  };
}

async function getIdentity(profile: AuthProfile): Promise<StudentDashboardIdentity> {
  if (!profile.instituteId) throw new Error("STUDENT_DASHBOARD_UNAUTHORIZED");
  const supabase = await createClient();
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id,name")
    .eq("profile_id", profile.id)
    .eq("institute_id", profile.instituteId)
    .single();
  if (studentError || !student) throw new Error("STUDENT_DASHBOARD_IDENTITY_NOT_FOUND");

  const { data: assignment, error: assignmentError } = await supabase
    .from("student_assignments")
    .select("academic_year_id,batch_id,academic_year:academic_years!student_assignments_academic_year_fkey(name),batch:batches!student_assignments_batch_compatibility_fkey(name),board:boards!student_assignments_board_fkey(name),academic_class:academic_classes!student_assignments_class_fkey(class_name)")
    .eq("student_id", student.id)
    .eq("institute_id", profile.instituteId)
    .eq("status", "Current")
    .is("effective_to", null)
    .maybeSingle();
  if (assignmentError) throw assignmentError;

  const current = assignment as unknown as AssignmentRow | null;
  return {
    id: (student as StudentRow).id,
    name: (student as StudentRow).name,
    academicYearId: current?.academic_year_id ?? null,
    academicYearName: current ? one(current.academic_year)?.name ?? null : null,
    batchId: current?.batch_id ?? null,
    batchName: current ? one(current.batch)?.name ?? null : null,
    boardName: current ? one(current.board)?.name ?? null : null,
    className: current ? one(current.academic_class)?.class_name ?? null : null,
  };
}

async function getAttendance(profile: AuthProfile, student: StudentDashboardIdentity): Promise<AttendanceTotals | null> {
  if (!profile.instituteId) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("student_attendance_summary", {
    p_institute_id: profile.instituteId,
    p_student_id: student.id,
    p_academic_year_id: student.academicYearId,
    p_date_from: null,
    p_date_to: null,
  });
  if (error || !data) return null;
  const summary = data as unknown as AttendanceTotals;
  return summary.totalCount > 0 ? summary : null;
}

async function getPractice(profile: AuthProfile, student: StudentDashboardIdentity): Promise<{ summary: StudentPracticeSummary; progress: StudentPracticeProgress }> {
  if (!profile.instituteId) throw new Error("STUDENT_DASHBOARD_UNAUTHORIZED");
  const supabase = await createClient();
  const [assignmentResult, attemptResult] = await Promise.all([
    supabase.from("practice_assignments").select("id,status,due_at,set:practice_sets!practice_assignments_set_fkey(title,skill,topic)").eq("institute_id", profile.instituteId).eq("student_id", student.id).order("due_at", { ascending: true, nullsFirst: false }),
    supabase.from("practice_attempts").select("practice_assignment_id,attempt_no,submitted_at,score_obtained,max_marks,percentage").eq("institute_id", profile.instituteId).eq("student_id", student.id).in("status", ["submitted", "reviewed"]).order("submitted_at", { ascending: false }),
  ]);
  if (assignmentResult.error) throw assignmentResult.error;
  if (attemptResult.error) throw attemptResult.error;

  const assignments = assignmentResult.data as unknown as PracticeAssignmentRow[];
  const attempts = (attemptResult.data ?? []) as AttemptRow[];
  const now = new Date();
  const soon = new Date(now);
  soon.setDate(soon.getDate() + 7);
  const latestByAssignment = new Map<string, AttemptRow>();
  attempts.forEach((attempt) => {
    if (!latestByAssignment.has(attempt.practice_assignment_id)) latestByAssignment.set(attempt.practice_assignment_id, attempt);
  });
  const actionable = assignments.find((item) => item.status === "in_progress") ?? assignments.find((item) => item.status === "assigned") ?? assignments.find((item) => item.status === "completed") ?? null;
  const actionableAttempt = actionable ? latestByAssignment.get(actionable.id) ?? null : null;
  const percentages = attempts.map((item) => item.percentage).filter((value): value is number => value !== null).map(Number);
  const firstAttempts = attempts.filter((item) => item.attempt_no === 1 && item.percentage !== null).map((item) => Number(item.percentage));
  const retryPairs = attempts.filter((item) => item.attempt_no > 1 && item.percentage !== null).map((retry) => {
    const first = attempts.find((item) => item.practice_assignment_id === retry.practice_assignment_id && item.attempt_no === 1 && item.percentage !== null);
    return first ? Number(retry.percentage) - Number(first.percentage) : null;
  }).filter((value): value is number => value !== null);

  return {
    summary: {
      pending: assignments.filter((item) => item.status === "assigned").length,
      inProgress: assignments.filter((item) => item.status === "in_progress").length,
      completed: assignments.filter((item) => item.status === "completed").length,
      dueSoon: assignments.filter((item) => item.due_at && item.status !== "completed" && new Date(item.due_at) >= now && new Date(item.due_at) <= soon).length,
      overdue: assignments.filter((item) => item.due_at && item.status !== "completed" && new Date(item.due_at) < now).length,
      actionableItem: actionable ? {
        assignmentId: actionable.id,
        title: one(actionable.set)?.title ?? "Practice Work",
        skill: one(actionable.set)?.skill ?? null,
        topic: one(actionable.set)?.topic ?? null,
        status: actionable.status,
        dueAt: actionable.due_at,
        latestPercentage: actionableAttempt?.percentage === null || actionableAttempt?.percentage === undefined ? null : Number(actionableAttempt.percentage),
        scoreObtained: actionableAttempt?.score_obtained === null || actionableAttempt?.score_obtained === undefined ? null : Number(actionableAttempt.score_obtained),
        maxMarks: actionableAttempt ? Number(actionableAttempt.max_marks) : null,
      } : null,
    },
    progress: {
      submittedAttempts: attempts.length,
      completedSets: new Set(attempts.map((item) => item.practice_assignment_id)).size,
      averagePercentage: percentages.length ? percentages.reduce((sum, value) => sum + value, 0) / percentages.length : null,
      latestPercentage: percentages[0] ?? null,
      firstAttemptPercentage: firstAttempts.length ? firstAttempts.reduce((sum, value) => sum + value, 0) / firstAttempts.length : null,
      retryImprovement: retryPairs.length ? retryPairs.reduce((sum, value) => sum + value, 0) / retryPairs.length : null,
    },
  };
}

export async function getStudentDashboardData(profile: AuthProfile): Promise<StudentDashboardData> {
  const student = await getIdentity(profile);
  const today = new Date();
  const upcomingEnd = new Date(today);
  upcomingEnd.setDate(upcomingEnd.getDate() + 14);

  const [eventsResult, practiceResult, attendanceResult, notificationsResult, quote, holidayResult, results] = await Promise.all([
    listScheduleEvents(profile, { dateFrom: dateValue(today), dateTo: dateValue(upcomingEnd), batchId: student.batchId ?? undefined }).catch(() => []),
    getPractice(profile, student).catch(() => ({ summary: { pending: 0, inProgress: 0, completed: 0, dueSoon: 0, overdue: 0, actionableItem: null }, progress: { submittedAttempts: 0, completedSets: 0, averagePercentage: null, latestPercentage: null, firstAttemptPercentage: null, retryImprovement: null } })),
    getAttendance(profile, student).catch(() => null),
    listPlannerNotifications(profile).catch(() => []),
    getStudentQuote(),
    getHolidayCalendar(profile, dateValue(today), dateValue(upcomingEnd)).catch(() => ({ holidays: [], providerAvailable: false })),
    listPublishedResults(profile).catch(() => []),
  ]);
  const events = eventsResult.map(toDashboardEvent);
  const todayValue = dateValue(today);
  const customHolidays: StudentHoliday[] = events.filter((event) => event.scheduleType === "holiday" && event.status !== "cancelled").map((event) => ({ id: event.id, name: event.title, date: event.eventDate, scope: "institute" }));
  const holidays: StudentHoliday[] = [...customHolidays, ...holidayResult.holidays.filter((holiday) => holiday.observedAsHoliday !== false).map((holiday) => ({ id: holiday.id, name: holiday.name, date: holiday.date, scope: holiday.scope }))].filter((holiday,index,items)=>items.findIndex(item=>item.date===holiday.date&&item.name===holiday.name)===index);
  const learningEvents = events.filter((event) => event.scheduleType !== "holiday");
  const todaysEvents = learningEvents.filter((event) => event.eventDate === todayValue);
  const nextEvent = todaysEvents.find((event) => event.status !== "cancelled" && (!event.startTime || event.startTime >= today.toTimeString().slice(0, 5))) ?? null;

  return {
    student,
    quote,
    todaysEvents,
    holidays,
    nextEvent,
    practice: practiceResult.summary,
    attendance: attendanceResult,
    progress: practiceResult.progress,
    upcomingEvents: learningEvents.filter((event) => event.eventDate > todayValue).slice(0, 6),
    notifications: notificationsResult.slice(0, 5).map((notification) => ({ recipientId: notification.recipientId, title: notification.title, message: notification.message, priority: notification.priority, readAt: notification.readAt, createdAt: notification.createdAt })),
    unreadNotifications: notificationsResult.filter((notification) => !notification.readAt).length,
    recentResults: results.slice(0, 5),
  };
}

export async function getStudentSchedule(profile: AuthProfile): Promise<StudentDashboardEvent[]> {
  const student = await getIdentity(profile);
  const from = new Date();
  const to = new Date(from);
  to.setDate(to.getDate() + 30);
  return (await listScheduleEvents(profile, { dateFrom: dateValue(from), dateTo: dateValue(to), batchId: student.batchId ?? undefined })).filter((event)=>event.scheduleType!=="holiday").map(toDashboardEvent);
}

export async function getStudentScheduleHolidays(profile:AuthProfile):Promise<StudentHoliday[]>{const from=new Date();const to=new Date(from);to.setDate(to.getDate()+30);const calendar=await getHolidayCalendar(profile,dateValue(from),dateValue(to));return calendar.holidays.filter(holiday=>holiday.observedAsHoliday!==false).map(holiday=>({id:holiday.id,name:holiday.name,date:holiday.date,scope:holiday.scope}));}

export async function getStudentAttendance(profile: AuthProfile): Promise<AttendanceTotals | null> {
  return getAttendance(profile, await getIdentity(profile));
}

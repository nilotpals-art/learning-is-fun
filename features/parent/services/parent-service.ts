import "server-only";

import type { AuthProfile } from "@/features/auth/types/auth";
import { listFeeDues, listFeePayments } from "@/features/fees/services/fee-service";
import { listParentRolloverRequests } from "@/features/rollover/services/rollover-service";
import type { AttendanceMonthRecord, AttendanceSummary, ContinuationSummary, ExamResultSummary, FeeDueSummary, NotificationSummary, ParentChild, ScheduleEventSummary } from "@/features/parent/types/parent";
import { createClient } from "@/lib/supabase/server";

function scope(profile: AuthProfile): string { if (!profile.instituteId) throw new Error("PARENT_UNAUTHORIZED"); return profile.instituteId; }
function check(error: { message: string } | null): void { if (error) throw error; }
const one = <T>(value: T | T[] | null): T | null => !value ? null : Array.isArray(value) ? value[0] ?? null : value;

export async function getParentChildren(profile: AuthProfile): Promise<ParentChild[]> {
  scope(profile); const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_parent_dashboard_children"); check(error);
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    studentId: String(row.student_id), studentName: String(row.student_name ?? "Student"), admissionNo: row.admission_no ? String(row.admission_no) : null,
    className: row.class_name ? String(row.class_name) : null, batchName: row.batch_name ? String(row.batch_name) : null, academicYearName: row.academic_year_name ? String(row.academic_year_name) : null,
  }));
}

export async function getAttendanceSummary(profile: AuthProfile, studentId: string, monthsBack = 6): Promise<AttendanceSummary> {
  scope(profile); const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_parent_student_attendance", { p_student_id: studentId, p_months_back: monthsBack }); check(error);
  const records = ((data ?? []) as Array<{ attendance_date: string; status: string; remarks?: string | null }>);
  let present=0, absent=0, late=0, leave=0; const monthlyMap=new Map<string,AttendanceMonthRecord>();
  for (const row of records) { const key=row.attendance_date.slice(0,7); const e=monthlyMap.get(key) ?? {month:key,present:0,absent:0,late:0,leave:0,percentage:0};
    if(row.status==="Present"){present++;e.present++;} else if(row.status==="Absent"){absent++;e.absent++;} else if(row.status==="Late"){late++;e.late++;} else if(row.status==="Leave"){leave++;e.leave++;} monthlyMap.set(key,e); }
  const total=present+absent+late+leave; const monthlyTrend=[...monthlyMap.values()].sort((a,b)=>a.month.localeCompare(b.month)).map((m)=>{const t=m.present+m.absent+m.late+m.leave;return {...m,percentage:t?Math.round((m.present/t)*1000)/10:0};});
  return { totalCount:total,presentCount:present,absentCount:absent,lateCount:late,leaveCount:leave,percentage:total?Math.round((present/total)*1000)/10:0,monthlyTrend,history:records.map((r)=>({attendanceDate:r.attendance_date,status:r.status,remarks:r.remarks??null})) };
}

export async function getExamResultSummaries(profile: AuthProfile, studentId: string): Promise<ExamResultSummary[]> {
  const instituteId=scope(profile); const supabase=await createClient();
  const {data,error}=await supabase.from("exam_student_results").select("marks_obtained,grade,result_indicator,result_comment,set:exam_result_sets!exam_student_results_set_fkey(max_marks,status,event:schedule_events!exam_result_sets_event_fkey(title,event_date,subject:subjects!schedule_events_subject_fkey(subject_name)))").eq("institute_id",instituteId).eq("student_id",studentId); check(error);
  return (data??[]).filter((r)=>one(r.set)?.status==="published").map((r)=>{const set=one(r.set)!;const event=one(set.event)!;const marks=Number(r.marks_obtained),max=Number(set.max_marks);return {examTitle:event.title,subjectName:one(event.subject)?.subject_name??null,examDate:event.event_date,marksObtained:marks,maxMarks:max,percentage:max?Math.round((marks/max)*1000)/10:0,grade:r.grade,resultIndicator:r.result_indicator as ExamResultSummary["resultIndicator"],resultComment:r.result_comment};}).sort((a,b)=>b.examDate.localeCompare(a.examDate));
}

export async function getFeeDueSummary(profile: AuthProfile, studentId: string): Promise<FeeDueSummary> {
  const [dues,payments]=await Promise.all([listFeeDues(profile,studentId),listFeePayments(profile,studentId)]); const today=new Date().toISOString().slice(0,10); const outstanding=dues.filter((d)=>d.outstanding>0); const overdue=outstanding.filter((d)=>d.dueDate<today); const latest=payments.find((p)=>p.status==="posted")??null;
  return { totalOutstanding:outstanding.reduce((s,d)=>s+d.outstanding,0), overdueAmount:overdue.reduce((s,d)=>s+d.outstanding,0), overdueCount:overdue.length, nextDueDate:outstanding.filter((d)=>d.dueDate>=today).map((d)=>d.dueDate).sort()[0]??null, recentPayment:latest?{paymentDate:latest.paymentDate,amount:latest.amount,receiptNo:latest.receiptNo}:null };
}

export async function getUpcomingScheduleEvents(profile: AuthProfile, studentId: string, daysAhead=14): Promise<ScheduleEventSummary[]> {
  scope(profile); const supabase=await createClient(); const {data,error}=await supabase.rpc("list_parent_student_schedule",{p_student_id:studentId,p_days_ahead:daysAhead}); check(error);
  return ((data??[]) as Array<Record<string,unknown>>).map((r)=>({id:String(r.id),title:String(r.title??"Scheduled Class"),eventDate:String(r.event_date),startTime:r.start_time?String(r.start_time).slice(0,5):null,endTime:r.end_time?String(r.end_time).slice(0,5):null,scheduleType:String(r.schedule_type??"regular_class"),subjectName:r.subject_name?String(r.subject_name):null,batchName:r.batch_name?String(r.batch_name):null,status:String(r.status??"scheduled")}));
}

export async function getContinuationSummary(profile: AuthProfile): Promise<ContinuationSummary> { const requests=await listParentRolloverRequests(profile); let pendingCount=0,continuingCount=0,notContinuingCount=0; for(const r of requests){if(r.parentResponse==="continuing")continuingCount++;else if(r.parentResponse==="not_continuing")notContinuingCount++;else pendingCount++;} return {pendingCount,continuingCount,notContinuingCount}; }

export async function getNotificationSummary(profile: AuthProfile): Promise<NotificationSummary> { const supabase=await createClient(); const {data,error}=await supabase.from("notification_recipients").select("id,read_at,created_at,notification:notifications!notification_recipients_notification_fkey(title,message,priority)").eq("user_id",profile.id).order("created_at",{ascending:false}).limit(50); check(error); const rows=data??[]; return {totalCount:rows.length,unreadCount:rows.filter((r)=>!r.read_at).length,recent:rows.slice(0,5).map((r)=>{const n=one(r.notification);return {recipientId:r.id,title:n?.title??"",message:n?.message??"",priority:n?.priority??"normal",createdAt:r.created_at,readAt:r.read_at};})}; }

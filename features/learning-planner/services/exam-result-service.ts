import "server-only";
import type { AuthProfile } from "@/features/auth/types/auth";
import type { ExamResultSheet, PublishedStudentResult, ResultIndicator, FollowUpStatus } from "@/features/learning-planner/types/exam-result";
import { createClient } from "@/lib/supabase/server";

const one = <T>(value: T | T[] | null): T | null => Array.isArray(value) ? value[0] ?? null : value;
function institute(profile: AuthProfile) { if (!profile.instituteId) throw new Error("EXAM_RESULTS_UNAUTHORIZED"); return profile.instituteId; }

export async function listEligibleExamEvents(profile: AuthProfile) {
  const db = await createClient();
  let query = db.from("schedule_events").select("id,title,event_date,status,batch:batches!schedule_events_batch_fkey(name),subject:subjects!schedule_events_subject_fkey(subject_name),sets:exam_result_sets(id,status,version_no)").eq("institute_id", institute(profile)).eq("schedule_type", "exam").in("status", ["scheduled", "completed"]).order("event_date", { ascending: false });
  if (profile.branchId) query = query.eq("branch_id", profile.branchId);
  const { data, error } = await query; if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, title: row.title, eventDate: row.event_date, status: row.status, batchName: one(row.batch)?.name ?? "", subjectName: one(row.subject)?.subject_name ?? null, resultStatus: (row.sets ?? []).find((set) => set.status === "draft")?.status ?? (row.sets ?? []).find((set) => set.status === "published")?.status ?? null }));
}

export async function getExamResultSheet(profile: AuthProfile, eventId: string): Promise<ExamResultSheet | null> {
  const db = await createClient();
  const { data: event, error } = await db.from("schedule_events").select("id,title,event_date,academic_year_id,batch_id,status,schedule_type,academic_year:academic_years!schedule_events_academic_year_fkey(name),batch:batches!schedule_events_batch_fkey(name,class:academic_classes(name)),subject:subjects!schedule_events_subject_fkey(subject_name)").eq("id", eventId).eq("institute_id", institute(profile)).maybeSingle();
  if (error) throw error; if (!event || event.schedule_type !== "exam" || !["scheduled", "completed"].includes(event.status) || !event.batch_id) return null;
  const { data: set, error: setError } = await db.from("exam_result_sets").select("id,version_no,max_marks,status,published_at,correction_reason,results:exam_student_results(student_id,student_assignment_id,marks_obtained,grade,remarks,result_indicator,result_comment,follow_up_status,student:students!exam_student_results_student_fkey(admission_no,name))").eq("schedule_event_id", eventId).in("status", ["draft", "published"]).order("status").limit(1).maybeSingle();
  if (setError) throw setError;
  let students: ExamResultSheet["students"];
  if (set) students = (set.results ?? []).map((result) => { const student = one(result.student); const marks = Number(result.marks_obtained); return { id: result.student_id, assignmentId: result.student_assignment_id, admissionNo: student?.admission_no ?? "", name: student?.name ?? "", marksObtained: marks, grade: result.grade, remarks: result.remarks, resultIndicator: result.result_indicator as ResultIndicator | null, resultComment: result.result_comment, followUpStatus: result.follow_up_status as FollowUpStatus | null, percentage: marks / Number(set.max_marks) * 100 }; });
  else { const { data: roster, error: rosterError } = await db.from("student_assignments").select("id,student_id,student:students!student_assignments_student_fkey(admission_no,name,status)").eq("institute_id", institute(profile)).eq("batch_id", event.batch_id).eq("academic_year_id", event.academic_year_id).lte("effective_from", event.event_date).or(`effective_to.is.null,effective_to.gte.${event.event_date}`); if (rosterError) throw rosterError; students = (roster ?? []).filter((row) => one(row.student)?.status === "Active").map((row) => ({ id: row.student_id, assignmentId: row.id, admissionNo: one(row.student)?.admission_no ?? "", name: one(row.student)?.name ?? "", marksObtained: 0, grade: null, remarks: null, resultIndicator: null, resultComment: null, followUpStatus: null, percentage: 0 })); }
  const marks = students.map((student) => student.marksObtained); const batch = one(event.batch);
  return { id: set?.id ?? null, eventId: event.id, title: event.title, examDate: event.event_date, academicYearName: one(event.academic_year)?.name ?? "", batchName: batch?.name ?? "", className: one(batch?.class ?? null)?.name ?? "", subjectName: one(event.subject)?.subject_name ?? null, versionNo: set?.version_no ?? 1, maxMarks: Number(set?.max_marks ?? 100), status: (set?.status as ExamResultSheet["status"]) ?? null, publishedAt: set?.published_at ?? null, correctionReason: set?.correction_reason ?? null, students, highest: marks.length ? Math.max(...marks) : null, lowest: marks.length ? Math.min(...marks) : null, average: marks.length ? marks.reduce((a, b) => a + b, 0) / marks.length : null };
}

export async function saveExamResultDraft(input: { eventId: string; maxMarks: number; correctionReason?: string | null; results: Array<{ studentId: string; studentAssignmentId: string; marksObtained: number; grade?: string | null; remarks?: string | null; resultIndicator?: ResultIndicator | null; resultComment?: string | null; followUpStatus?: FollowUpStatus | null }> }) { const db = await createClient(); const { data, error } = await db.rpc("save_exam_result_draft", { p_event_id: input.eventId, p_max_marks: input.maxMarks, p_results: input.results, p_correction_reason: input.correctionReason ?? null }); if (error) throw error; return data as { result_set_id: string }; }
export async function publishExamResult(eventId: string) { const db = await createClient(); const { data, error } = await db.rpc("publish_exam_result", { p_event_id: eventId }); if (error) throw error; return data as { result_set_id: string }; }

export async function listPublishedResults(profile: AuthProfile): Promise<PublishedStudentResult[]> {
  const db = await createClient();
  const { data, error } = await db.from("exam_student_results").select("student_id,marks_obtained,grade,remarks,result_indicator,result_comment,student:students!exam_student_results_student_fkey(name,admission_no,profile_id),set:exam_result_sets!exam_student_results_set_fkey(id,schedule_event_id,max_marks,status,event:schedule_events!exam_result_sets_event_fkey(title,event_date,subject:subjects!schedule_events_subject_fkey(subject_name)))").eq("institute_id", institute(profile)); if (error) throw error;
  const visible = (data ?? []).filter((row) => { const student = one(row.student), set = one(row.set); return set?.status === "published" && (profile.role !== "Student" || student?.profile_id === profile.id); });
  const ids = [...new Set(visible.map((row) => one(row.set)!.id))];
  const { data: stats, error: statsError } = ids.length ? await db.rpc("get_published_exam_result_stats", { p_result_set_ids: ids }) : { data: [], error: null }; if (statsError) throw statsError;
  const highest = new Map<string, number>((stats as Array<{ result_set_id: string; highest_marks: number | string }> ?? []).map((row) => [row.result_set_id, Number(row.highest_marks)]));
  return visible.map((row) => { const student = one(row.student)!; const set = one(row.set)!; const event = one(set.event)!; const marks = Number(row.marks_obtained), max = Number(set.max_marks); return { resultSetId: set.id, eventId: set.schedule_event_id, title: event.title, examDate: event.event_date, subjectName: one(event.subject)?.subject_name ?? null, maxMarks: max, marksObtained: marks, percentage: marks / max * 100, grade: row.grade, remarks: row.remarks, resultIndicator: row.result_indicator as ResultIndicator | null, resultComment: row.result_comment, highest: highest.get(set.id) ?? marks, studentId: row.student_id, studentName: student.name, admissionNo: student.admission_no }; }).sort((a, b) => b.examDate.localeCompare(a.examDate));
}

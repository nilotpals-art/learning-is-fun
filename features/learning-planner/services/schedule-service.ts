import "server-only";

import type { AuthProfile } from "@/features/auth/types/auth";
import type { ClassSchedule, CreateScheduleInput, PlannerOptions, UpdateScheduleInput } from "@/features/learning-planner/types/learning-planner";
import { createClient } from "@/lib/supabase/server";

interface ScheduleRow { id: string; branch_id: string | null; academic_year_id: string; batch_id: string; subject_id: string | null; day_of_week: number; start_time: string; end_time: string; schedule_type: ClassSchedule["scheduleType"]; room: string | null; effective_from: string; effective_to: string | null; is_active: boolean; academic_year: { name: string;start_date:string;end_date:string } | { name: string;start_date:string;end_date:string }[]; batch: { name: string } | { name: string }[]; subject: { subject_name: string } | { subject_name: string }[] | null }
const one = <T>(value: T | T[]): T => Array.isArray(value) ? value[0] : value;
const optionalOne = <T>(value: T | T[] | null): T | null => value ? one(value) : null;
function scope(profile: AuthProfile) { if (!profile.instituteId) throw new Error("PLANNER_UNAUTHORIZED"); return profile.instituteId; }
function mapSchedule(row: ScheduleRow): ClassSchedule { const year=one(row.academic_year);return { id: row.id, branchId: row.branch_id, academicYearId: row.academic_year_id, academicYearName: year.name,academicYearStartDate:year.start_date,academicYearEndDate:year.end_date, batchId: row.batch_id, batchName: one(row.batch).name, subjectId: row.subject_id, subjectName: optionalOne(row.subject)?.subject_name ?? null, dayOfWeek: row.day_of_week, startTime: row.start_time.slice(0, 5), endTime: row.end_time.slice(0, 5), scheduleType: row.schedule_type, room: row.room, effectiveFrom: row.effective_from, effectiveTo: row.effective_to, isActive: row.is_active }; }

export async function listPlannerOptions(profile: AuthProfile): Promise<PlannerOptions> {
  const instituteId = scope(profile); const supabase = await createClient();
  const [years, batches, subjects, branches] = await Promise.all([
    supabase.from("academic_years").select("id,name").eq("institute_id", instituteId).eq("is_active", true).order("start_date", { ascending: false }),
    supabase.from("batches").select("id,name,academic_year_id,subject_id,branch_id,subject:subjects!batches_subject_id_fkey(subject_name)").eq("institute_id", instituteId).eq("is_active", true).order("name"),
    supabase.from("subjects").select("id,subject_name").eq("institute_id", instituteId).order("subject_name"),
    supabase.from("branches").select("id,name").eq("institute_id", instituteId).order("name"),
  ]); const error = years.error ?? batches.error ?? subjects.error ?? branches.error; if (error) throw error;
  const map = (rows: { id: string; name: string }[] | null) => (rows ?? []).map(({ id, name }) => ({ id, label: name }));
  return { academicYears: map(years.data), batches: (batches.data ?? []).map((batch) => ({ id: batch.id, label: batch.name, academicYearId: batch.academic_year_id, subjectId: batch.subject_id, subjectName: optionalOne(batch.subject)?.subject_name ?? null, branchId: batch.branch_id })), subjects: (subjects.data ?? []).map((subject) => ({ id: subject.id, label: subject.subject_name })), branches: map(branches.data) };
}

export async function listClassSchedules(profile: AuthProfile): Promise<ClassSchedule[]> {
  const instituteId = scope(profile); const supabase = await createClient();
  let query = supabase.from("class_schedules").select("id,branch_id,academic_year_id,batch_id,subject_id,day_of_week,start_time,end_time,schedule_type,room,effective_from,effective_to,is_active,academic_year:academic_years!class_schedules_academic_year_fkey(name,start_date,end_date),batch:batches!class_schedules_batch_fkey(name),subject:subjects!class_schedules_subject_fkey(subject_name)").eq("institute_id", instituteId).order("day_of_week").order("start_time");
  if (profile.branchId) query = query.eq("branch_id", profile.branchId); const { data, error } = await query; if (error) throw error; return (data as unknown as ScheduleRow[]).map(mapSchedule);
}

async function validateOwnership(profile: AuthProfile, input: CreateScheduleInput): Promise<void> {
  const instituteId = scope(profile); const supabase = await createClient();
  const checks = [supabase.from("academic_years").select("id").eq("id", input.academicYearId).eq("institute_id", instituteId).eq("is_active", true).maybeSingle(), supabase.from("batches").select("id").eq("id", input.batchId).eq("institute_id", instituteId).eq("is_active", true).maybeSingle()];
  if (input.subjectId) checks.push(supabase.from("subjects").select("id").eq("id", input.subjectId).eq("institute_id", instituteId).maybeSingle());
  if (input.branchId) checks.push(supabase.from("branches").select("id").eq("id", input.branchId).eq("institute_id", instituteId).maybeSingle());
  const results = await Promise.all(checks); if (results.some((result) => result.error || !result.data)) throw new Error("PLANNER_REFERENCE_INVALID");
  if (profile.branchId && input.branchId !== profile.branchId) throw new Error("PLANNER_BRANCH_INVALID");
}

export async function createClassSchedule(profile: AuthProfile, input: CreateScheduleInput): Promise<string> { await validateOwnership(profile, input); const supabase = await createClient(); const { data, error } = await supabase.from("class_schedules").insert({ institute_id: scope(profile), branch_id: input.branchId ?? null, academic_year_id: input.academicYearId, batch_id: input.batchId, subject_id: input.subjectId ?? null, day_of_week: input.dayOfWeek, start_time: input.startTime, end_time: input.endTime, schedule_type: input.scheduleType, room: input.room ?? null, effective_from: input.effectiveFrom, effective_to: input.effectiveTo ?? null, created_by: profile.id }).select("id").single(); if (error) throw error; return data.id; }
export async function updateClassSchedule(profile: AuthProfile, input: UpdateScheduleInput): Promise<void> { await validateOwnership(profile, input); const supabase = await createClient(); const { data, error } = await supabase.from("class_schedules").update({ branch_id: input.branchId ?? null, academic_year_id: input.academicYearId, batch_id: input.batchId, subject_id: input.subjectId ?? null, day_of_week: input.dayOfWeek, start_time: input.startTime, end_time: input.endTime, schedule_type: input.scheduleType, room: input.room ?? null, effective_from: input.effectiveFrom, effective_to: input.effectiveTo ?? null }).eq("id", input.id).eq("institute_id", scope(profile)).select("id").maybeSingle(); if (error) throw error; if (!data) throw new Error("PLANNER_NOT_FOUND"); }
export async function deactivateClassSchedule(profile: AuthProfile, id: string): Promise<void> { const supabase = await createClient(); const { data, error } = await supabase.from("class_schedules").update({ is_active: false }).eq("id", id).eq("institute_id", scope(profile)).select("id").maybeSingle(); if (error) throw error; if (!data) throw new Error("PLANNER_NOT_FOUND"); }

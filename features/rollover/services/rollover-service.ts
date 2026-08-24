import "server-only";

import type { AuthProfile } from "@/features/auth/types/auth";
import type {
  AdminEnrollmentBreak,
  ParentEnrollmentBreak,
  ParentRolloverRequest,
  RolloverBatchOption,
  RolloverRequestDetail,
  RolloverWorkspaceRow,
} from "@/features/rollover/types/rollover";
import { createClient } from "@/lib/supabase/server";

function institute(profile: AuthProfile): string {
  if (!profile.instituteId) throw new Error("ROLLOVER_UNAUTHORIZED");
  return profile.instituteId;
}

async function weekdaysByBatch(batchIds: string[]): Promise<Map<string, number[]>> {
  const result = new Map<string, number[]>();
  if (!batchIds.length) return result;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("class_schedules")
    .select("batch_id, day_of_week")
    .in("batch_id", batchIds)
    .eq("is_active", true)
    .order("day_of_week");
  if (error) throw error;
  for (const row of data ?? []) {
    if (!row.batch_id) continue;
    const current = result.get(row.batch_id) ?? [];
    if (!current.includes(row.day_of_week)) current.push(row.day_of_week);
    result.set(row.batch_id, current);
  }
  return result;
}

export async function listRolloverYearOptions(instituteId: string): Promise<Array<{ id: string; label: string; startDate: string; deadline: string | null }>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academic_years")
    .select("id, name, start_date, continuation_response_deadline")
    .eq("institute_id", instituteId)
    .eq("is_active", true)
    .order("start_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((year) => ({
    id: year.id as string,
    label: year.name as string,
    startDate: year.start_date as string,
    deadline: (year.continuation_response_deadline as string | null | undefined) ?? null,
  }));
}

export async function listRolloverWorkspace(
  profile: AuthProfile,
  sourceYearId: string,
  targetYearId: string
): Promise<RolloverWorkspaceRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_rollover_workspace", {
    p_source_year_id: sourceYearId,
    p_target_year_id: targetYearId,
  });
  if (error) throw error;
  return (data as unknown as RolloverWorkspaceRow[]) ?? [];
}

export async function getRolloverRequestDetail(
  profile: AuthProfile,
  requestId: string
): Promise<RolloverRequestDetail> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_rollover_request_detail", {
    p_request_id: requestId,
  });
  if (error) throw error;
  return data as RolloverRequestDetail;
}

export async function listRolloverEligibleBatches(
  profile: AuthProfile,
  requestId: string
): Promise<RolloverBatchOption[]> {
  institute(profile);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_rollover_eligible_batches", {
    p_request_id: requestId,
  });
  if (error) throw error;
  const batches = ((data as unknown as Omit<RolloverBatchOption, "weekdays">[]) ?? []);
  const weekdays = await weekdaysByBatch(batches.map((batch) => batch.batchId));
  return batches.map((batch) => ({ ...batch, weekdays: weekdays.get(batch.batchId) ?? [] }));
}

export async function listParentRolloverRequests(
  profile: AuthProfile
): Promise<ParentRolloverRequest[]> {
  institute(profile);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_parent_rollover_requests");
  if (error) throw error;
  return (data as unknown as ParentRolloverRequest[]) ?? [];
}

export async function listParentEnrollmentBreaks(
  profile: AuthProfile
): Promise<ParentEnrollmentBreak[]> {
  institute(profile);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_parent_enrollment_breaks");
  if (error) throw error;
  return (data as unknown as ParentEnrollmentBreak[]) ?? [];
}

export async function listAdminEnrollmentBreaks(
  profile: AuthProfile
): Promise<AdminEnrollmentBreak[]> {
  institute(profile);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_admin_enrollment_breaks");
  if (error) throw error;
  return (data as unknown as AdminEnrollmentBreak[]) ?? [];
}

export async function listBreakFormOptions(instituteId: string) {
  const supabase = await createClient();
  const [students, years, batches] = await Promise.all([
    supabase.from("students").select("id, name, admission_no").eq("institute_id", instituteId).eq("status", "Active").order("name"),
    supabase.from("academic_years").select("id, name").eq("institute_id", instituteId).eq("is_active", true).order("start_date", { ascending: false }),
    supabase.from("batches").select("id, name, schedules:class_schedules!class_schedules_batch_fkey(day_of_week,is_active)").eq("institute_id", instituteId).eq("is_active", true).order("name"),
  ]);
  const error = students.error ?? years.error ?? batches.error;
  if (error) throw error;
  return {
    students: (students.data ?? []).map((x) => ({ id: x.id as string, label: `${x.name as string} (${x.admission_no as string})` })),
    academicYears: (years.data ?? []).map((x) => ({ id: x.id as string, label: x.name as string })),
    batches: (batches.data ?? []).map((x) => ({
      id: x.id as string,
      label: x.name as string,
      weekdays: [...new Set((((x as unknown as { schedules?: Array<{ day_of_week: number; is_active: boolean }> }).schedules) ?? []).filter((schedule) => schedule.is_active).map((schedule) => schedule.day_of_week))].sort((a, b) => a - b),
    })),
  };
}

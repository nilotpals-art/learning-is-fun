import "server-only";

import type { AuthProfile } from "@/features/auth/types/auth";
import type { ScheduleGenerationInput, ScheduleGenerationResult } from "@/features/learning-planner/types/learning-planner";
import { createClient } from "@/lib/supabase/server";

export async function generateScheduleEvents(
  profile: AuthProfile,
  input: ScheduleGenerationInput
): Promise<ScheduleGenerationResult> {
  if (!profile.instituteId) throw new Error("PLANNER_UNAUTHORIZED");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("generate_schedule_events", {
    p_from_date: input.fromDate,
    p_to_date: input.toDate,
    p_batch_id: input.batchId ?? null,
    p_class_schedule_id: input.classScheduleId ?? null,
  });
  if (error) throw error;
  return data as ScheduleGenerationResult;
}

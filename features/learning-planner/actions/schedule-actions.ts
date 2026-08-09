"use server";
import { revalidatePath } from "next/cache";
import { createClassSchedule, deactivateClassSchedule, updateClassSchedule } from "@/features/learning-planner/services/schedule-service";
import { classScheduleSchema, deactivateClassScheduleSchema, updateClassScheduleSchema } from "@/features/learning-planner/schemas/schedule-schema";
import { scheduleGenerationSchema } from "@/features/learning-planner/schemas/materialization-schema";
import { generateScheduleEvents } from "@/features/learning-planner/services/materialization-service";
import type { PlannerActionResult, ScheduleGenerationActionResult } from "@/features/learning-planner/types/learning-planner";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";
const message = (error: unknown) => error instanceof Error && error.message.includes("PLANNER_REFERENCE_INVALID") ? "A selected Academic Year, Batch, Subject, or Branch is unavailable." : "We could not save this Class Schedule.";
export async function createClassScheduleAction(input: unknown): Promise<PlannerActionResult> { const parsed = classScheduleSchema.safeParse(input); if (!parsed.success) return { status: "error", message: "Correct the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors }; const profile = await requireRole(DASHBOARD_ROLES); try { const id = await createClassSchedule(profile, parsed.data); revalidatePath("/learning-planner/schedules"); return { status: "success", message: "Class Schedule created.", id }; } catch (error) { return { status: "error", message: message(error) }; } }
export async function updateClassScheduleAction(input: unknown): Promise<PlannerActionResult> { const parsed = updateClassScheduleSchema.safeParse(input); if (!parsed.success) return { status: "error", message: "Correct the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors }; const profile = await requireRole(DASHBOARD_ROLES); try { await updateClassSchedule(profile, parsed.data); revalidatePath("/learning-planner/schedules"); return { status: "success", message: "Class Schedule updated." }; } catch (error) { return { status: "error", message: message(error) }; } }
export async function deactivateClassScheduleAction(input: unknown): Promise<PlannerActionResult> { const parsed = deactivateClassScheduleSchema.safeParse(input); if (!parsed.success) return { status: "error", message: "Invalid Class Schedule." }; const profile = await requireRole(DASHBOARD_ROLES); try { await deactivateClassSchedule(profile, parsed.data.id); revalidatePath("/learning-planner/schedules"); return { status: "success", message: "Class Schedule deactivated." }; } catch { return { status: "error", message: "We could not deactivate this Class Schedule." }; } }

export async function generateScheduleEventsAction(input: unknown): Promise<ScheduleGenerationActionResult> {
  const parsed = scheduleGenerationSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Correct the generation range.", fieldErrors: parsed.error.flatten().fieldErrors };
  const profile = await requireRole(DASHBOARD_ROLES);
  try {
    const result = await generateScheduleEvents(profile, parsed.data);
    ["/learning-planner", "/learning-planner/calendar", "/learning-planner/events", "/learning-planner/schedules"].forEach((path) => revalidatePath(path));
    return { status: "success", message: `Generated ${result.generatedCount} Calendar Event${result.generatedCount === 1 ? "" : "s"}.`, result };
  } catch (error) {
    const value = error instanceof Error ? error.message : "";
    const controlled = value.includes("PLANNER_GENERATION_RANGE_TOO_LARGE") ? "Generate a maximum of 90 days at a time."
      : value.includes("PLANNER_BATCH_INVALID") ? "The selected Batch is unavailable."
      : value.includes("PLANNER_SCHEDULE_NOT_FOUND") ? "The selected recurring schedule is unavailable."
      : "We could not generate Calendar Events.";
    return { status: "error", message: controlled };
  }
}

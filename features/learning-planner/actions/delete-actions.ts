"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export type PlannerDeleteResult = { status: "success" | "error"; message: string };

function refreshPlanner() {
  [
    "/learning-planner",
    "/learning-planner/calendar",
    "/learning-planner/events",
    "/learning-planner/history",
    "/parent/dashboard",
    "/parent/schedule",
    "/student/dashboard",
    "/student/schedule",
  ].forEach((path) => revalidatePath(path));
}

function messageFor(error: unknown): string {
  const message = error && typeof error === "object" && "message" in error ? String(error.message) : "";
  if (message.includes("PLANNER_EVENT_PAST")) return "Past events cannot be deleted from the Calendar. Delete them from History instead.";
  if (message.includes("PLANNER_EVENT_HAS_EXAM_RESULTS")) return "This event has an Exam Result Set. Remove the exam result first, then delete the event.";
  if (message.includes("PLANNER_EVENT_NOT_FOUND")) return "The Schedule Event was not found.";
  if (message.includes("PLANNER_DELETE_UNAUTHORIZED")) return "You are not authorised to delete Planner records.";
  return "The Schedule Event could not be deleted.";
}

export async function deleteForthcomingPlannerEventAction(eventId: string): Promise<PlannerDeleteResult> {
  await requireRole(DASHBOARD_ROLES);
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) return { status: "error", message: "Invalid Schedule Event." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("delete_forthcoming_planner_event", { p_event_id: eventId });
  if (error) return { status: "error", message: messageFor(error) };
  refreshPlanner();
  const result = data as { deleted?: number; restoredRecurringClass?: boolean } | null;
  return {
    status: "success",
    message: result?.restoredRecurringClass
      ? "Event deleted everywhere. The normal recurring class has been restored."
      : "Event deleted everywhere.",
  };
}

export async function deletePlannerEventFromHistoryAction(eventId: string): Promise<PlannerDeleteResult> {
  await requireRole(DASHBOARD_ROLES);
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) return { status: "error", message: "Invalid Schedule Event." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("delete_planner_event_from_history", { p_event_id: eventId });
  if (error) return { status: "error", message: messageFor(error) };
  refreshPlanner();
  const result = data as { restoredRecurringClass?: boolean } | null;
  return {
    status: "success",
    message: result?.restoredRecurringClass
      ? "Event deleted everywhere. The normal recurring class has been restored."
      : "Event deleted everywhere.",
  };
}

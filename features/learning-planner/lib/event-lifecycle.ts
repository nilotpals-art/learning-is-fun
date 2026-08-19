import type { ScheduleEvent, ScheduleType } from "@/features/learning-planner/types/learning-planner";

export interface LifecycleMenuItem {
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

export const labels: Record<ScheduleType, string> = {
  regular_class: "Regular Class",
  extra_class: "Extra Class",
  mock_test: "Mock Test",
  exam: "Exam",
  parent_meeting: "Parent Meeting",
  holiday: "Holiday",
  practice_work: "Practice Work",
  practice_test: "Practice Test",
  special_class: "Special Class",
};

const DEFAULT_WHATSAPP_TYPES: ScheduleType[] = [
  "extra_class",
  "mock_test",
  "exam",
  "parent_meeting",
  "holiday",
];

export function defaultWhatsapp(type: ScheduleType) {
  return DEFAULT_WHATSAPP_TYPES.includes(type);
}

export function effectiveEventStatus(event: ScheduleEvent): ScheduleEvent["status"] {
  if (event.status !== "scheduled") return event.status;
  if (!event.endTime) return event.status;
  const endAt = new Date(`${event.eventDate}T${event.endTime}:00`);
  if (Number.isNaN(endAt.getTime())) return event.status;
  return endAt.getTime() < Date.now() ? "completed" : event.status;
}

export function eventStatusTone(status: ScheduleEvent["status"]) {
  if (status === "cancelled") return "bg-red-50 text-red-700 ring-1 ring-red-200";
  if (status === "completed") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  if (status === "rescheduled") return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  return "bg-sky-50 text-sky-700 ring-1 ring-sky-200";
}

export function eventLabel(event: ScheduleEvent) {
  if (event.reschedulePending) return "Reschedule Pending";
  if (event.scheduleType === "extra_class") return "Extra Class";
  const status = effectiveEventStatus(event);
  return status === "scheduled" ? "Scheduled" : status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Derives the compact action list for a given event based on spec:
 *
 * Scheduled Regular (projected):
 *   Cancel Class, Reschedule Class
 *
 * Scheduled Extra Class:
 *   Cancel Class, Reschedule
 *
 * Active Rescheduled Class:
 *   Cancel Class, Reschedule Again
 *
 * Reschedule Pending:
 *   Schedule New Date/Time
 *
 * Final Cancelled:
 *   no lifecycle actions
 *
 * Completed:
 *   no lifecycle actions
 */
export function buildMenuItems(
  event: ScheduleEvent,
  status: ScheduleEvent["status"],
  onCancel: () => void,
  onReschedule: (kind: "reschedule" | "replacement") => void,
  onCreateExtra: () => void,
  onNavigate: (path: string) => void,
  onComplete: () => void,
): LifecycleMenuItem[] {
  const items: LifecycleMenuItem[] = [];

  // Reschedule Pending: only Schedule New Date/Time
  if (!event.isProjected && event.reschedulePending) {
    items.push({ label: "Schedule New Date/Time", onSelect: () => onReschedule("replacement") });
    return items;
  }

  // Final Cancelled or Completed: no lifecycle actions
  if (status !== "cancelled" && status !== "completed") {
    if (event.isProjected && event.scheduleType === "regular_class") {
      // Scheduled Regular (projected): Cancel + Reschedule
      items.push({ label: "Cancel Class", onSelect: onCancel, danger: true });
      items.push({ label: "Reschedule Class", onSelect: () => onReschedule("reschedule") });
    } else if (event.scheduleType === "extra_class" && event.status === "scheduled") {
      // Scheduled Extra Class: Cancel + Reschedule
      items.push({ label: "Cancel Class", onSelect: onCancel, danger: true });
      items.push({ label: "Reschedule", onSelect: () => onReschedule("reschedule") });
    } else if (event.status === "rescheduled") {
      // Active Rescheduled Class: Cancel + Reschedule Again
      items.push({ label: "Cancel Class", onSelect: onCancel, danger: true });
      items.push({ label: "Reschedule Again", onSelect: () => onReschedule("reschedule") });
    } else if (!event.isProjected && event.status === "scheduled") {
      // Persisted scheduled event (not extra_class, not rescheduled): Cancel + Reschedule
      items.push({ label: "Cancel Class", onSelect: onCancel, danger: true });
      items.push({ label: "Reschedule", onSelect: () => onReschedule("reschedule") });
    }
  }

  // Extra: Create Extra Class from a regular class
  if (event.scheduleType === "regular_class" && !event.isProjected) {
    items.push({ label: "Create Extra Class", onSelect: onCreateExtra });
  }

  // Mark Complete (only for non-projected scheduled events)
  if (!event.isProjected && status === "scheduled") {
    items.push({ label: "Mark Complete", onSelect: onComplete });
  }

  // View History (only for persisted events)
  if (!event.isProjected) {
    items.push({ label: "View History", onSelect: () => onNavigate(`/learning-planner/history?event=${event.id}`) });
  }

  // Exam results
  if (event.scheduleType === "exam") {
    items.push({ label: "Results", onSelect: () => onNavigate(`/learning-planner/exam-results/${event.id}`) });
  }

  return items;
}
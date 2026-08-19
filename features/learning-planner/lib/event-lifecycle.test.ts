import assert from "node:assert/strict";
import test from "node:test";
import type { ScheduleEvent } from "@/features/learning-planner/types/learning-planner";
// @ts-expect-error Node's type-stripping test runner requires the explicit TypeScript extension.
import { buildMenuItems, effectiveEventStatus, eventLabel } from "./event-lifecycle.ts";

const baseEvent = (overrides: Partial<ScheduleEvent> = {}): ScheduleEvent => ({
  id: "event-1",
  branchId: null,
  academicYearId: "year-1",
  academicYearName: "2026-27",
  batchId: "batch-1",
  batchName: "Batch A",
  classScheduleId: null,
  subjectId: null,
  subjectName: null,
  eventDate: "2026-08-20",
  startTime: "10:00",
  endTime: "11:00",
  scheduleType: "regular_class",
  status: "scheduled",
  title: "Physics",
  description: null,
  room: null,
  originalEventId: null,
  rescheduleReason: null,
  cancellationReason: null,
  notificationRequired: true,
  relatedEventId: null,
  reschedulePending: false,
  reschedulePendingResolvedAt: null,
  createdAt: "2026-08-01T00:00:00.000Z",
  ...overrides,
});

const LIFECYCLE_LABELS = [
  "Cancel Class",
  "Reschedule",
  "Reschedule Class",
  "Reschedule Again",
  "Schedule New Date/Time",
] as const;

function lifecycleLabels(event: ScheduleEvent) {
  return buildMenuItems(
    event,
    effectiveEventStatus(event),
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
  )
    .map((item) => item.label)
    .filter((label) => (LIFECYCLE_LABELS as readonly string[]).includes(label));
}

test("effectiveEventStatus never auto-completes a cancelled event, even in the past", () => {
  assert.equal(
    effectiveEventStatus(baseEvent({ status: "cancelled", eventDate: "2020-01-01", endTime: "09:00" })),
    "cancelled",
  );
});

test("effectiveEventStatus keeps non-scheduled statuses unchanged", () => {
  assert.equal(
    effectiveEventStatus(baseEvent({ status: "rescheduled", eventDate: "2026-08-20" })),
    "rescheduled",
  );
  assert.equal(
    effectiveEventStatus(baseEvent({ status: "completed", eventDate: "2099-08-20" })),
    "completed",
  );
});

test("effectiveEventStatus marks a past scheduled event as completed", () => {
  assert.equal(
    effectiveEventStatus(baseEvent({ eventDate: "2020-01-01", endTime: "09:00" })),
    "completed",
  );
});

test("effectiveEventStatus keeps future and all-day scheduled events as scheduled", () => {
  assert.equal(
    effectiveEventStatus(baseEvent({ eventDate: "2099-08-20", endTime: "11:00" })),
    "scheduled",
  );
  assert.equal(
    effectiveEventStatus(baseEvent({ eventDate: "2099-08-20", endTime: null })),
    "scheduled",
  );
});

test("buildMenuItems shows Cancel Class + Reschedule Class for a projected regular class", () => {
  assert.deepEqual(
    lifecycleLabels(baseEvent({ isProjected: true, scheduleType: "regular_class", status: "scheduled" })),
    ["Cancel Class", "Reschedule Class"],
  );
});

test("buildMenuItems shows Cancel Class + Reschedule for a scheduled extra class", () => {
  assert.deepEqual(
    lifecycleLabels(baseEvent({ isProjected: true, scheduleType: "extra_class", status: "scheduled" })),
    ["Cancel Class", "Reschedule"],
  );
});

test("buildMenuItems shows Cancel Class + Reschedule Again for an active rescheduled event", () => {
  assert.deepEqual(
    lifecycleLabels(baseEvent({ status: "rescheduled" })),
    ["Cancel Class", "Reschedule Again"],
  );
});

test("buildMenuItems shows only Schedule New Date/Time for a reschedule-pending event", () => {
  assert.deepEqual(
    lifecycleLabels(baseEvent({ isProjected: false, reschedulePending: true, status: "cancelled" })),
    ["Schedule New Date/Time"],
  );
});

test("buildMenuItems wires the replacement kind for reschedule-pending events", () => {
  const kinds: Array<"reschedule" | "replacement"> = [];
  const items = buildMenuItems(
    baseEvent({ isProjected: false, reschedulePending: true, status: "cancelled" }),
    "cancelled",
    () => {},
    (kind) => kinds.push(kind),
    () => {},
    () => {},
    () => {},
  );
  items.forEach((item) => item.onSelect());
  assert.deepEqual(kinds, ["replacement"]);
});

test("buildMenuItems exposes no lifecycle actions for a final-cancelled event", () => {
  assert.deepEqual(
    lifecycleLabels(baseEvent({ isProjected: false, status: "cancelled" })),
    [],
  );
});

test("buildMenuItems exposes no lifecycle actions for a completed event", () => {
  assert.deepEqual(
    lifecycleLabels(baseEvent({ isProjected: false, status: "completed" })),
    [],
  );
});

test("buildMenuItems does not offer actions merely because the type matches; status must be valid", () => {
  const completedProjected = lifecycleLabels(
    baseEvent({ isProjected: true, scheduleType: "regular_class", status: "completed" }),
  );
  assert.deepEqual(completedProjected, []);
});

test("eventLabel shows Reschedule Pending and Extra Class labels", () => {
  assert.equal(eventLabel(baseEvent({ reschedulePending: true, status: "cancelled" })), "Reschedule Pending");
  assert.equal(eventLabel(baseEvent({ scheduleType: "extra_class", status: "scheduled" })), "Extra Class");
});

test("eventLabel reflects effective status for scheduled events", () => {
  assert.equal(eventLabel(baseEvent({ eventDate: "2020-01-01", endTime: "09:00" })), "Completed");
  assert.equal(eventLabel(baseEvent({ eventDate: "2099-08-20", endTime: "11:00" })), "Scheduled");
  assert.equal(eventLabel(baseEvent({ status: "cancelled" })), "Cancelled");
});

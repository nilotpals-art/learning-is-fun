import "server-only";

import type { AuthProfile } from "@/features/auth/types/auth";
import { listScheduleEvents } from "@/features/learning-planner/services/event-service";
import { getHolidayCalendar } from "@/features/learning-planner/services/holiday-service";
import { listClassSchedules } from "@/features/learning-planner/services/schedule-service";
import type {
  ClassSchedule,
  ScheduleEvent,
} from "@/features/learning-planner/types/learning-planner";
import { createClient } from "@/lib/supabase/server";

const DAY_MS = 86_400_000;

function utcDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function dateValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function recurringOccurrenceId(
  classScheduleId: string,
  occurrenceDate: string,
): string {
  return `recurring:${classScheduleId}:${occurrenceDate}`;
}

function sourceKey(classScheduleId: string, occurrenceDate: string): string {
  return `${classScheduleId}|${occurrenceDate}`;
}

function isDateApplicable(schedule: ClassSchedule, date: string): boolean {
  const effectiveEnd = schedule.effectiveTo ?? schedule.academicYearEndDate;
  return (
    date >= schedule.effectiveFrom &&
    date <= effectiveEnd &&
    date >= schedule.academicYearStartDate &&
    date <= schedule.academicYearEndDate
  );
}

function projectedEvent(schedule: ClassSchedule, date: string): ScheduleEvent {
  return {
    id: recurringOccurrenceId(schedule.id, date),
    branchId: schedule.branchId,
    academicYearId: schedule.academicYearId,
    academicYearName: schedule.academicYearName,
    batchId: schedule.batchId,
    batchName: schedule.batchName,
    classScheduleId: schedule.id,
    subjectId: schedule.subjectId,
    subjectName: schedule.subjectName,
    eventDate: date,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    scheduleType: "regular_class",
    status: "scheduled",
    title: `${schedule.subjectName ?? "CLASS"} - ${schedule.batchName}`,
    description: null,
    room: schedule.room,
    originalEventId: null,
    relatedEventId: null,
    reschedulePending: false,
    reschedulePendingResolvedAt: null,
    rescheduleReason: null,
    cancellationReason: null,
    notificationRequired: false,
    createdAt: `${date}T00:00:00.000Z`,
    isProjected: true,
    sourceOccurrenceDate: date,
  };
}

export function expandRecurringSchedules({
  schedules,
  persistedEvents,
  nonWorkingHolidayDates,
  fromDate,
  toDate,
  batchWindows,
  activeBatchIds,
}: {
  schedules: ClassSchedule[];
  persistedEvents: ScheduleEvent[];
  nonWorkingHolidayDates: Set<string>;
  fromDate: string;
  toDate: string;
  batchWindows?: Map<string, Array<{ fromDate: string; toDate: string }>>;
  activeBatchIds?: Set<string>;
}): ScheduleEvent[] {
  const persistedSources = new Set(
    persistedEvents
      .filter(
        (event) =>
          event.classScheduleId &&
          !event.originalEventId &&
          event.scheduleType === "regular_class",
      )
      .map((event) => sourceKey(event.classScheduleId!, event.eventDate)),
  );
  const start = utcDate(fromDate);
  const end = utcDate(toDate);
  const result: ScheduleEvent[] = [];

  for (const schedule of schedules) {
    if (!schedule.isActive) continue;
    if (activeBatchIds && !activeBatchIds.has(schedule.batchId)) continue;
    const windows = batchWindows?.get(schedule.batchId);
    if (batchWindows && !windows?.length) continue;
    for (let time = start.getTime(); time <= end.getTime(); time += DAY_MS) {
      const occurrence = new Date(time);
      const date = dateValue(occurrence);
      const dayOfWeek = occurrence.getUTCDay() || 7;
      if (schedule.dayOfWeek !== dayOfWeek) continue;
      if (!isDateApplicable(schedule, date)) continue;
      if (!schedule.isActive && !schedule.effectiveTo) continue;
      if (
        windows &&
        !windows.some((window) => date >= window.fromDate && date <= window.toDate)
      ) {
        continue;
      }
      if (nonWorkingHolidayDates.has(date)) continue;
      if (persistedSources.has(sourceKey(schedule.id, date))) continue;
      result.push(projectedEvent(schedule, date));
    }
  }
  return result;
}

async function listActiveBatchIds(profile: AuthProfile): Promise<Set<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("batches")
    .select("id")
    .eq("institute_id", profile.instituteId)
    .eq("is_active", true);
  if (error) throw error;
  return new Set((data ?? []).map((batch) => batch.id));
}

export async function listCalendarReadModel(
  profile: AuthProfile,
  fromDate: string,
  toDate: string,
  batchWindows?: Map<string, Array<{ fromDate: string; toDate: string }>>,
): Promise<ScheduleEvent[]> {
  const [schedules, allPersistedEvents, holidayData, activeBatchIds] = await Promise.all([
    listClassSchedules(profile),
    listScheduleEvents(profile, { dateFrom: fromDate, dateTo: toDate }),
    getHolidayCalendar(profile, fromDate, toDate).catch(() => ({
      holidays: [],
      providerAvailable: false,
    })),
    listActiveBatchIds(profile),
  ]);
  const persistedEvents = allPersistedEvents.filter(
    (event) => !event.batchId || activeBatchIds.has(event.batchId),
  );
  const nonWorkingHolidayDates = new Set(
    holidayData.holidays
      .filter((holiday) => holiday.imported && holiday.observedAsHoliday === true)
      .map((holiday) => holiday.date),
  );
  persistedEvents
    .filter(
      (event) =>
        event.scheduleType === "holiday" &&
        event.status === "scheduled" &&
        !event.startTime &&
        !event.endTime,
    )
    .forEach((event) => nonWorkingHolidayDates.add(event.eventDate));

  const projections = expandRecurringSchedules({
    schedules,
    persistedEvents,
    nonWorkingHolidayDates,
    fromDate,
    toDate,
    batchWindows,
    activeBatchIds,
  });
  return [...persistedEvents, ...projections].sort(
    (left, right) =>
      left.eventDate.localeCompare(right.eventDate) ||
      (left.startTime ?? "").localeCompare(right.startTime ?? "") ||
      left.id.localeCompare(right.id),
  );
}

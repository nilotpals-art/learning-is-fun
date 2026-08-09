export const SCHEDULE_TYPES = ["regular_class", "practice_work", "practice_test", "mock_test", "exam", "parent_meeting", "holiday", "special_class"] as const;
export const SCHEDULE_STATUSES = ["scheduled", "rescheduled", "cancelled", "completed"] as const;
export const SCHEDULE_CHANGE_TYPES = ["created", "rescheduled", "cancelled", "restored", "completed"] as const;
export const NOTIFICATION_PRIORITIES = ["normal", "important", "urgent"] as const;
export const DELIVERY_CHANNELS = ["in_app", "email"] as const;

export type ScheduleType = (typeof SCHEDULE_TYPES)[number];
export type ScheduleStatus = (typeof SCHEDULE_STATUSES)[number];
export type ScheduleChangeType = (typeof SCHEDULE_CHANGE_TYPES)[number];
export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number];
export type DeliveryChannel = (typeof DELIVERY_CHANNELS)[number];

export interface PlannerOption { id: string; label: string }
export interface PlannerOptions { academicYears: PlannerOption[]; batches: PlannerOption[]; subjects: PlannerOption[]; branches: PlannerOption[] }
export interface ClassSchedule {
  id: string; branchId: string | null; academicYearId: string; academicYearName: string;
  batchId: string; batchName: string; subjectId: string | null; subjectName: string | null;
  dayOfWeek: number; startTime: string; endTime: string; scheduleType: ScheduleType;
  room: string | null; effectiveFrom: string; effectiveTo: string | null; isActive: boolean;
}
export interface ScheduleEvent {
  id: string; branchId: string | null; academicYearId: string; academicYearName: string;
  batchId: string | null; batchName: string | null; classScheduleId: string | null;
  subjectId: string | null; subjectName: string | null; eventDate: string; startTime: string | null;
  endTime: string | null; scheduleType: ScheduleType; status: ScheduleStatus; title: string;
  description: string | null; room: string | null; originalEventId: string | null;
  rescheduleReason: string | null; cancellationReason: string | null;
  notificationRequired: boolean; createdAt: string;
}
export interface ScheduleChange {
  id: string; scheduleEventId: string; eventTitle: string; changeType: ScheduleChangeType;
  oldDate: string | null; oldStartTime: string | null; oldEndTime: string | null;
  newDate: string | null; newStartTime: string | null; newEndTime: string | null;
  reason: string | null; changedByName: string; changedAt: string;
}
export interface PlannerNotification {
  recipientId: string; notificationId: string; title: string; message: string;
  priority: NotificationPriority; deliveryChannel: DeliveryChannel; deliveryStatus: string;
  readAt: string | null; createdAt: string;
}
export interface NotificationRecipient { id: string; notificationId: string; userId: string; recipientRole: string; deliveryChannel: DeliveryChannel; deliveryStatus: string; readAt: string | null; sentAt: string | null }
export interface CreateScheduleInput { branchId?: string; academicYearId: string; batchId: string; subjectId?: string; dayOfWeek: number; startTime: string; endTime: string; scheduleType: ScheduleType; room?: string; effectiveFrom: string; effectiveTo?: string; }
export interface UpdateScheduleInput extends CreateScheduleInput { id: string }
export interface CreateEventInput { branchId?: string; academicYearId: string; batchId?: string; classScheduleId?: string; subjectId?: string; eventDate: string; startTime?: string; endTime?: string; scheduleType: ScheduleType; title: string; description?: string; room?: string; notificationRequired: boolean }
export interface RescheduleEventInput { eventId: string; newDate: string; newStartTime: string; newEndTime: string; reason: string }
export interface CancelEventInput { eventId: string; reason: string }
export interface CompleteEventInput { eventId: string }
export interface PlannerFilters { dateFrom?: string; dateTo?: string; academicYearId?: string; batchId?: string; subjectId?: string; scheduleType?: ScheduleType; status?: ScheduleStatus }
export type EventConflictResult = { hasConflict: false } | { hasConflict: true; type: "batch" | "room"; conflictingEventId: string; message: string };
export type PlannerActionResult = { status: "success"; message: string; id?: string } | { status: "error"; message: string; fieldErrors?: Record<string, string[] | undefined> };
export interface PlannerOverview { classesToday: number; upcomingEvents: number; rescheduled: number; cancelled: number; nextEvent: ScheduleEvent | null; recentChanges: ScheduleChange[] }

export interface CalendarRange { fromDate: string; toDate: string }
export interface ScheduleGenerationInput extends CalendarRange { batchId?: string; classScheduleId?: string }
export interface ScheduleGenerationConflict {
  classScheduleId: string; date: string; startTime: string; endTime: string;
  batchId: string; room: string | null; type: "batch" | "room" | "holiday";
  conflictingEventId: string;
}
export interface GeneratedOccurrenceResult {
  classScheduleId: string; eventDate: string;
  outcome: "generated" | "already_exists" | "skipped_conflict" | "skipped_inactive" | "skipped_outside_effective_range";
  eventId?: string;
}
export interface ScheduleGenerationResult {
  generatedCount: number; existingCount: number; conflictCount: number; candidateCount: number;
  skippedInactiveCount: number; skippedOutsideRangeCount: number;
  generatedEventIds: string[]; conflicts: ScheduleGenerationConflict[];
}
export type ScheduleGenerationActionResult =
  | { status: "success"; message: string; result: ScheduleGenerationResult }
  | { status: "error"; message: string; fieldErrors?: Record<string, string[] | undefined> };

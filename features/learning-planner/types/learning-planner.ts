export const SCHEDULE_TYPES = ["regular_class", "extra_class", "practice_work", "practice_test", "mock_test", "exam", "parent_meeting", "holiday", "special_class"] as const;
export const CALENDAR_EVENT_TYPES = ["regular_class", "extra_class", "mock_test", "exam", "parent_meeting", "holiday"] as const;
export const EXPLICIT_CALENDAR_EVENT_TYPES = ["extra_class", "mock_test", "exam", "parent_meeting", "holiday"] as const;
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
export interface PlannerAcademicYearOption extends PlannerOption { isCurrent: boolean }
export interface PlannerBatchOption extends PlannerOption { academicYearId: string | null; subjectId: string | null; subjectName: string | null; branchId: string | null }
export interface PlannerOptions { academicYears: PlannerAcademicYearOption[]; batches: PlannerBatchOption[]; subjects: PlannerOption[]; branches: PlannerOption[] }
export interface ClassSchedule {
  id: string; branchId: string | null; academicYearId: string; academicYearName: string;
  academicYearStartDate: string; academicYearEndDate: string;
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
  notificationRequired: boolean; relatedEventId: string | null; reschedulePending: boolean; reschedulePendingResolvedAt: string | null; createdAt: string;
  isProjected?: boolean; sourceOccurrenceDate?: string;
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
export interface PlannerMessageOutboxItem { id:string;eventTitle:string;recipientRole:string;messageType:string;status:string;attemptCount:number;createdAt:string;lastErrorCode:string|null }
export interface NotificationRecipient { id: string; notificationId: string; userId: string; recipientRole: string; deliveryChannel: DeliveryChannel; deliveryStatus: string; readAt: string | null; sentAt: string | null }
export interface CreateScheduleInput { branchId?: string; academicYearId: string; batchId: string; subjectId?: string; dayOfWeek: number; startTime: string; endTime: string; scheduleType: ScheduleType; room?: string; effectiveFrom: string; effectiveTo?: string; }
export interface UpdateScheduleInput extends CreateScheduleInput { id: string }
export interface CreateEventInput { branchId?: string; academicYearId: string; batchId?: string; classScheduleId?: string; subjectId?: string; relatedEventId?: string; eventDate: string; startTime?: string; endTime?: string; scheduleType: ScheduleType; title: string; description?: string; room?: string; notificationRequired: boolean; whatsappRequested?: boolean }
export interface EventOverlapConflict { kind:"recurring_timetable"|"exception_event";sameBatch:boolean;batchId:string;batchName:string;classScheduleId:string|null;eventId:string|null;date:string;startTime:string;endTime:string }
export interface RescheduleEventInput { eventId: string; newDate: string; newStartTime: string; newEndTime: string; reason: string; approveOverlap?:boolean; overlapReason?:string; whatsappRequested?:boolean }
export interface RecurringOccurrenceActionInput { classScheduleId:string;occurrenceDate:string;action:"cancel"|"reschedule";reason:string;reschedulePending?:boolean;newDate?:string;newStartTime?:string;newEndTime?:string;approveOverlap?:boolean;overlapReason?:string;whatsappRequested?:boolean }
export interface CancelEventInput { eventId: string; reason: string }
export interface CompleteEventInput { eventId: string }
export interface PlannerFilters { dateFrom?: string; dateTo?: string; academicYearId?: string; batchId?: string; subjectId?: string; scheduleType?: ScheduleType; status?: ScheduleStatus }
export type EventConflictResult = { hasConflict: false } | { hasConflict: true; type: "batch"; conflictingEventId: string; message: string };
export type PlannerActionResult = { status: "success"; message: string; id?: string } | { status: "error"; message: string; fieldErrors?: Record<string, string[] | undefined> };
export type EventPlannerActionResult = PlannerActionResult | { status: "conflict"; message: string; conflicts: EventOverlapConflict[] };
export interface PlannerOverview { classesToday: number; upcomingEvents: number; rescheduled: number; cancelled: number; nextEvent: ScheduleEvent | null; recentChanges: ScheduleChange[] }

export type HolidayScope = "national" | "state" | "institute" | "branch";
export interface HolidaySettings { countryCode: "IN"; stateCode: string | null; showNationalHolidays: boolean; showStateHolidays: boolean; portalThemeEnabled: boolean }
export interface PublicHoliday { id: string; externalId: string | null; provider: string | null; name: string; date: string; scope: HolidayScope; subdivisionCode: string | null; branchId: string | null; source: "external" | "imported" | "institute"; readOnly: boolean; imported: boolean; observedAsHoliday: boolean | null }
export interface HolidayCalendarData { holidays: PublicHoliday[]; providerAvailable: boolean }
export interface HolidayImportInput { externalId: string; provider: string; name: string; date: string; scope: "national" | "state"; subdivisionCode?: string; branchId?: string; observedAsHoliday: boolean }

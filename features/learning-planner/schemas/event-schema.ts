import { z } from "zod";
import { SCHEDULE_STATUSES, SCHEDULE_TYPES } from "@/features/learning-planner/types/learning-planner";
import { normalizeUpperText } from "@/lib/validation/normalization";

const uuid = z.string().uuid(); const optionalUuid = z.union([uuid, z.literal("")]).optional().transform((v) => v || undefined);
const optionalTime = z.union([z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), z.literal("")]).optional().transform((v) => v || undefined);
const optionalUpper = (value: string | undefined): string | undefined => value ? normalizeUpperText(value) || undefined : undefined;
export const scheduleEventSchema = z.object({
  branchId: optionalUuid, academicYearId: uuid, batchId: optionalUuid, classScheduleId: optionalUuid, subjectId: optionalUuid, relatedEventId: optionalUuid,
  eventDate: z.string().date(), startTime: optionalTime, endTime: optionalTime, scheduleType: z.enum(SCHEDULE_TYPES),
  status: z.enum(SCHEDULE_STATUSES).default("scheduled"), title: z.string().transform(normalizeUpperText).pipe(z.string().min(1).max(150)),
  description: z.string().max(1000).optional().transform(optionalUpper), room: z.string().max(100).optional().transform(optionalUpper),
  notificationRequired: z.coerce.boolean().default(true), whatsappRequested: z.coerce.boolean().default(false),approveOverlap:z.boolean().optional().default(false),overlapReason:z.string().trim().max(500).optional().transform(optionalUpper),
}).superRefine((value, ctx) => { const both = Boolean(value.startTime) === Boolean(value.endTime); if (!both) ctx.addIssue({ code: "custom", path: ["endTime"], message: "Provide both Start and End Time, or leave both blank." }); if (["regular_class","extra_class","mock_test","exam","parent_meeting"].includes(value.scheduleType) && !value.batchId) ctx.addIssue({ code: "custom", path: ["batchId"], message: "Batch is required for this Event Type." }); if (value.startTime && value.endTime && value.endTime <= value.startTime) ctx.addIssue({ code: "custom", path: ["endTime"], message: "End Time must be later than Start Time." }); if (["regular_class","parent_meeting","holiday"].includes(value.scheduleType) && value.subjectId) ctx.addIssue({code:"custom",path:["subjectId"],message:"Subject is derived or not applicable for this Event Type."}); });
export const cancelEventSchema = z.object({ eventId: uuid, reason: z.string().transform(normalizeUpperText).pipe(z.string().min(3).max(500)) });
export const cancelEventOptionsSchema = cancelEventSchema.extend({ reschedulePending: z.boolean().default(false), whatsappRequested: z.boolean().default(true) });
export const completeEventSchema = z.object({ eventId: uuid });
export const recurringOccurrenceActionSchema=z.object({classScheduleId:uuid,occurrenceDate:z.string().date(),action:z.enum(["cancel","reschedule"]),reason:z.string().transform(normalizeUpperText).pipe(z.string().min(3).max(500)),reschedulePending:z.boolean().optional().default(false),newDate:z.string().date().optional(),newStartTime:optionalTime,newEndTime:optionalTime,approveOverlap:z.boolean().optional().default(false),overlapReason:z.string().trim().max(500).optional().transform(optionalUpper),whatsappRequested:z.boolean().optional().default(false)}).superRefine((value,ctx)=>{if(value.action==="reschedule"&&(!value.newDate||!value.newStartTime||!value.newEndTime)){ctx.addIssue({code:"custom",path:["newDate"],message:"New date and time are required."});}if(value.newStartTime&&value.newEndTime&&value.newEndTime<=value.newStartTime)ctx.addIssue({code:"custom",path:["newEndTime"],message:"End Time must be later than Start Time."});});
export type ScheduleEventValues = z.infer<typeof scheduleEventSchema>;

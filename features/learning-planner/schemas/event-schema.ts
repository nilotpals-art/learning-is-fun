import { z } from "zod";
import { SCHEDULE_STATUSES, SCHEDULE_TYPES } from "@/features/learning-planner/types/learning-planner";
import { normalizeUpperText } from "@/lib/validation/normalization";

const uuid = z.string().uuid(); const optionalUuid = z.union([uuid, z.literal("")]).optional().transform((v) => v || undefined);
const optionalTime = z.union([z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), z.literal("")]).optional().transform((v) => v || undefined);
const optionalUpper = (value: string | undefined): string | undefined => value ? normalizeUpperText(value) || undefined : undefined;
export const scheduleEventSchema = z.object({
  branchId: optionalUuid, academicYearId: uuid, batchId: optionalUuid, classScheduleId: optionalUuid, subjectId: optionalUuid,
  eventDate: z.string().date(), startTime: optionalTime, endTime: optionalTime, scheduleType: z.enum(SCHEDULE_TYPES),
  status: z.enum(SCHEDULE_STATUSES).default("scheduled"), title: z.string().transform(normalizeUpperText).pipe(z.string().min(1).max(150)),
  description: z.string().max(1000).optional().transform(optionalUpper), room: z.string().max(100).optional().transform(optionalUpper),
  notificationRequired: z.coerce.boolean().default(true),
}).superRefine((value, ctx) => { const both = Boolean(value.startTime) === Boolean(value.endTime); if (!both) ctx.addIssue({ code: "custom", path: ["endTime"], message: "Provide both Start and End Time." }); if (value.scheduleType !== "holiday" && (!value.startTime || !value.endTime)) ctx.addIssue({ code: "custom", path: ["startTime"], message: "Time is required for this Event Type." }); if (value.scheduleType !== "holiday" && !value.batchId) ctx.addIssue({ code: "custom", path: ["batchId"], message: "Batch is required for this Event Type." }); if (value.startTime && value.endTime && value.endTime <= value.startTime) ctx.addIssue({ code: "custom", path: ["endTime"], message: "End Time must be later than Start Time." }); });
export const cancelEventSchema = z.object({ eventId: uuid, reason: z.string().transform(normalizeUpperText).pipe(z.string().min(3).max(500)) });
export const completeEventSchema = z.object({ eventId: uuid });
export type ScheduleEventValues = z.infer<typeof scheduleEventSchema>;

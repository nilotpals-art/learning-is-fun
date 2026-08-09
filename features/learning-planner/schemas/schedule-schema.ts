import { z } from "zod";
import { SCHEDULE_TYPES } from "@/features/learning-planner/types/learning-planner";
import { normalizeUpperText } from "@/lib/validation/normalization";

const uuid = z.string().uuid();
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid time.");
const optionalUpper = (value: string | undefined): string | undefined => value ? normalizeUpperText(value) || undefined : undefined;
const scheduleFields = z.object({
  branchId: z.union([uuid, z.literal("")]).optional().transform((v) => v || undefined), academicYearId: uuid,
  batchId: uuid, subjectId: z.union([uuid, z.literal("")]).optional().transform((v) => v || undefined),
  dayOfWeek: z.coerce.number().int().min(1).max(7), startTime: time, endTime: time,
  scheduleType: z.enum(SCHEDULE_TYPES), room: z.string().max(100).optional().transform(optionalUpper),
  effectiveFrom: z.string().date(), effectiveTo: z.union([z.string().date(), z.literal("")]).optional().transform((v) => v || undefined),
});
function validateDates(value: { startTime: string; endTime: string; effectiveFrom: string; effectiveTo?: string }, ctx: z.RefinementCtx) { if (value.endTime <= value.startTime) ctx.addIssue({ code: "custom", path: ["endTime"], message: "End Time must be later than Start Time." }); if (value.effectiveTo && value.effectiveTo < value.effectiveFrom) ctx.addIssue({ code: "custom", path: ["effectiveTo"], message: "Effective To cannot be earlier than Effective From." }); }
export const classScheduleSchema = scheduleFields.superRefine(validateDates);
export const updateClassScheduleSchema = scheduleFields.extend({ id: uuid }).superRefine(validateDates);
export const deactivateClassScheduleSchema = z.object({ id: uuid });
export type ClassScheduleValues = z.infer<typeof classScheduleSchema>;

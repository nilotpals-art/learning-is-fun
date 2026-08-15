import { z } from "zod";
import { normalizeUpperText } from "@/lib/validation/normalization";
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const rescheduleEventSchema = z.object({ eventId: z.string().uuid(), newDate: z.string().date(), newStartTime: time, newEndTime: time, reason: z.string().transform(normalizeUpperText).pipe(z.string().min(3).max(500)),approveOverlap:z.boolean().optional().default(false),overlapReason:z.string().trim().max(500).optional().transform(value=>value?normalizeUpperText(value):undefined) }).refine((v) => v.newEndTime > v.newStartTime, { path: ["newEndTime"], message: "End Time must be later than Start Time." });

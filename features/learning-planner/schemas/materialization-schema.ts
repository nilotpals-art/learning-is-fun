import { z } from "zod";

const optionalUuid = z.union([z.string().uuid(), z.literal("")]).optional().transform((value) => value || undefined);

export const scheduleGenerationSchema = z.object({
  fromDate: z.string().date("Enter a valid From Date."),
  toDate: z.string().date("Enter a valid To Date."),
  batchId: optionalUuid,
  classScheduleId: optionalUuid,
}).superRefine((value, context) => {
  const from = new Date(`${value.fromDate}T00:00:00Z`);
  const to = new Date(`${value.toDate}T00:00:00Z`);
  const days = Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1;
  if (to < from) context.addIssue({ code: "custom", path: ["toDate"], message: "To Date cannot be earlier than From Date." });
  if (days > 90) context.addIssue({ code: "custom", path: ["toDate"], message: "Generate a maximum of 90 days at a time." });
});

export type ScheduleGenerationValues = z.infer<typeof scheduleGenerationSchema>;

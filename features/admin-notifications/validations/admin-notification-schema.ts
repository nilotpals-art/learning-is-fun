import { z } from "zod";

export const adminNotificationSchema = z.object({
  notificationType: z.enum(["parent_call","parent_meeting","exam","homework_not_submitted","fee_reminder","schedule_change","general","urgent","custom"]),
  title: z.string().trim().min(2,"Enter a title.").max(120),
  message: z.string().trim().min(2,"Enter a message.").max(2000),
  priority: z.enum(["normal","important","urgent"]),
  audience: z.enum(["students","parents","both"]),
  batchIds: z.array(z.string().uuid()).default([]),
  studentIds: z.array(z.string().uuid()).default([]),
  portalEnabled: z.boolean().default(true),
  whatsappEnabled: z.boolean().default(false),
}).superRefine((value,ctx)=>{
  if (!value.batchIds.length && !value.studentIds.length) ctx.addIssue({code:"custom",path:["studentIds"],message:"Select at least one batch or student."});
  if (!value.portalEnabled && !value.whatsappEnabled) ctx.addIssue({code:"custom",path:["portalEnabled"],message:"Select Portal or WhatsApp delivery."});
});

export type AdminNotificationInput = z.infer<typeof adminNotificationSchema>;

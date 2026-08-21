"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";
import { adminNotificationSchema } from "@/features/admin-notifications/validations/admin-notification-schema";
import { sendAdminNotification } from "@/features/admin-notifications/services/admin-notification-service";

export async function sendAdminNotificationAction(input:unknown){
  const parsed=adminNotificationSchema.safeParse(input); if(!parsed.success)return{status:"error" as const,message:parsed.error.issues[0]?.message??"Check the notification details."};
  await requireRole(DASHBOARD_ROLES);
  try{const result=await sendAdminNotification(parsed.data);revalidatePath("/communication/notifications");revalidatePath("/student/notifications");revalidatePath("/parent/notifications");return{status:"success" as const,message:`Sent to ${result.portalRecipientCount} portal recipient(s)${parsed.data.whatsappEnabled?`; ${result.whatsappRecipientCount} WhatsApp message(s) queued`:""}.`,result};}
  catch(error){const message=error instanceof Error?error.message:"";return{status:"error" as const,message:message.includes("NO_RECIPIENTS")?"No eligible recipients were found.":"Could not send the notification."};}
}

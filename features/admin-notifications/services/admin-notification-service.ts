import "server-only";
import type { AuthProfile } from "@/features/auth/types/auth";
import type { AdminNotificationCampaign, AdminNotificationOptions, SendAdminNotificationResult } from "@/features/admin-notifications/types/admin-notification";
import type { AdminNotificationInput } from "@/features/admin-notifications/validations/admin-notification-schema";
import { createClient } from "@/lib/supabase/server";

const one=<T>(v:T|T[]|null):T|null=>!v?null:Array.isArray(v)?v[0]??null:v;

export async function listAdminNotificationOptions(profile:AuthProfile):Promise<AdminNotificationOptions>{
  if(!profile.instituteId) throw new Error("ADMIN_NOTIFICATION_UNAUTHORIZED");
  const supabase=await createClient();
  const [batches,students]=await Promise.all([
    supabase.from("batches").select("id,name").eq("institute_id",profile.instituteId).eq("is_active",true).order("name"),
    supabase.from("students").select("id,name,admission_no").eq("institute_id",profile.instituteId).eq("status","Active").order("name")
  ]);
  if(batches.error) throw batches.error;if(students.error) throw students.error;
  return {batches:(batches.data??[]).map(x=>({id:x.id,label:x.name})),students:(students.data??[]).map(x=>({id:x.id,label:`${x.name}${x.admission_no?` · ${x.admission_no}`:""}`}))};
}

export async function sendAdminNotification(input:AdminNotificationInput):Promise<SendAdminNotificationResult>{
  const supabase=await createClient();
  const {data,error}=await supabase.rpc("send_admin_notification_campaign",{
    p_notification_type:input.notificationType,p_title:input.title,p_message:input.message,p_priority:input.priority,p_audience:input.audience,p_batch_ids:input.batchIds,p_student_ids:input.studentIds,p_portal_enabled:input.portalEnabled,p_whatsapp_enabled:input.whatsappEnabled
  });
  if(error) throw error; const row=(data??{}) as Record<string,unknown>;
  return {campaignId:String(row.campaign_id),notificationId:String(row.notification_id),studentCount:Number(row.student_count??0),portalRecipientCount:Number(row.portal_recipient_count??0),whatsappRecipientCount:Number(row.whatsapp_recipient_count??0)};
}

export async function listAdminNotificationCampaigns(profile:AuthProfile):Promise<AdminNotificationCampaign[]>{
  if(!profile.instituteId) return[]; const supabase=await createClient();
  const {data,error}=await supabase.from("admin_notification_campaigns").select("id,notification_id,notification_type,audience,priority,portal_enabled,whatsapp_enabled,resolved_student_count,portal_recipient_count,whatsapp_recipient_count,created_at,notification:notifications!admin_notification_campaign_notification_fkey(title,message)").eq("institute_id",profile.instituteId).order("created_at",{ascending:false}).limit(50);
  if(error) throw error;
  return (data??[]).map(r=>{const n=one(r.notification);return {id:r.id,notificationId:r.notification_id,notificationType:r.notification_type,audience:r.audience as AdminNotificationCampaign["audience"],priority:r.priority as AdminNotificationCampaign["priority"],portalEnabled:r.portal_enabled,whatsappEnabled:r.whatsapp_enabled,resolvedStudentCount:r.resolved_student_count,portalRecipientCount:r.portal_recipient_count,whatsappRecipientCount:r.whatsapp_recipient_count,createdAt:r.created_at,title:n?.title??"",message:n?.message??""};});
}

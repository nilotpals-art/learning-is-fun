export type NotificationAudience = "students" | "parents" | "both";
export type NotificationPriority = "normal" | "important" | "urgent";
export interface NotificationOption { id: string; label: string }
export interface AdminNotificationOptions { batches: NotificationOption[]; students: NotificationOption[] }
export interface AdminNotificationCampaign { id:string; notificationId:string; notificationType:string; audience:NotificationAudience; priority:NotificationPriority; portalEnabled:boolean; whatsappEnabled:boolean; resolvedStudentCount:number; portalRecipientCount:number; whatsappRecipientCount:number; createdAt:string; title:string; message:string }
export interface SendAdminNotificationResult { campaignId:string; notificationId:string; studentCount:number; portalRecipientCount:number; whatsappRecipientCount:number }

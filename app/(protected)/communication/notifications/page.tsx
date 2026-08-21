import { PageHeader } from "@/components/layout/page-header";
import { AdminNotificationManager } from "@/features/admin-notifications/components/admin-notification-manager";
import { listAdminNotificationCampaigns,listAdminNotificationOptions } from "@/features/admin-notifications/services/admin-notification-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function AdminNotificationsPage(){
 const profile=await requireRole(DASHBOARD_ROLES);
 const [options,campaigns]=await Promise.all([listAdminNotificationOptions(profile),listAdminNotificationCampaigns(profile)]);
 return <div className="space-y-6"><PageHeader title="Notifications" description="Send portal notifications to selected students or parents, with optional WhatsApp queueing."/><AdminNotificationManager options={options} campaigns={campaigns}/></div>;
}

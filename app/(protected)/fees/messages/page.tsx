import { MessagesManager } from "@/features/fees/components/fees-manager";
import { QueuedMessageManager } from "@/features/fees/components/queued-message-manager";
import { listFeeMessages } from "@/features/fees/services/fee-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function Page() {
  const profile = await requireRole(DASHBOARD_ROLES);
  const messages = await listFeeMessages(profile);
  return <div className="space-y-6"><QueuedMessageManager messages={messages} /><MessagesManager messages={messages} /></div>;
}

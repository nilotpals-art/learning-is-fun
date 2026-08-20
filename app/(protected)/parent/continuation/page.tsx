import { ParentContinuationList } from "@/features/rollover/components/parent-continuation-list";
import { listParentRolloverRequests } from "@/features/rollover/services/rollover-service";
import { PageHeader } from "@/components/layout/page-header";
import { RefreshCw } from "lucide-react";
import { requireRole } from "@/lib/auth/services/auth-service";

export default async function ParentContinuationPage() {
  const profile = await requireRole(["Parent"]);
  const requests = await listParentRolloverRequests(profile);
  return <div className="space-y-6"><PageHeader title="Academic Continuation" description="Confirm whether your children will continue in the next Academic Year and select their preferred batch." icon={RefreshCw} theme="students" /><ParentContinuationList requests={requests} /></div>;
}
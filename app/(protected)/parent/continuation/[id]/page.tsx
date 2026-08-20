import { notFound } from "next/navigation";

import { ParentContinuationFlow } from "@/features/rollover/components/parent-continuation-flow";
import { getRolloverRequestDetail, listRolloverEligibleBatches } from "@/features/rollover/services/rollover-service";
import { requireRole } from "@/lib/auth/services/auth-service";

export default async function ParentContinuationRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole(["Parent"]);
  const { id } = await params;
  let detail;
  try {
    detail = await getRolloverRequestDetail(profile, id);
  } catch {
    notFound();
  }
  const batches = await listRolloverEligibleBatches(profile, id);
  return <ParentContinuationFlow detail={detail} batches={batches} />;
}
import { notFound, redirect } from "next/navigation";

import { RolloverRequestDetail } from "@/features/rollover/components/rollover-request-detail";
import { getRolloverRequestDetail, listAdminEnrollmentBreaks, listBreakFormOptions, listRolloverEligibleBatches } from "@/features/rollover/services/rollover-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function RolloverRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) redirect("/unauthorized");
  const { id } = await params;
  let detail;
  try {
    detail = await getRolloverRequestDetail(profile, id);
  } catch {
    notFound();
  }
  const [batches, breaks, breakOptions] = await Promise.all([
    listRolloverEligibleBatches(profile, id),
    listAdminEnrollmentBreaks(profile),
    listBreakFormOptions(profile.instituteId),
  ]);
  return <RolloverRequestDetail detail={detail} batches={batches} breaks={breaks} breakOptions={breakOptions} />;
}
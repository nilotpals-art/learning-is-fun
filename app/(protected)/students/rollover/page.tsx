import { redirect } from "next/navigation";

import { RolloverWorkspace } from "@/features/rollover/components/rollover-workspace";
import { listRolloverWorkspace, listRolloverYearOptions } from "@/features/rollover/services/rollover-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function RolloverPage({ searchParams }: { searchParams: Promise<{ source?: string; target?: string }> }) {
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) redirect("/unauthorized");
  const [years, params] = await Promise.all([listRolloverYearOptions(profile.instituteId), searchParams]);
  const targetYearId = years.some((y) => y.id === params.target) ? params.target! : years[0]?.id ?? "";
  const sourceYearId = years.some((y) => y.id === params.source) ? params.source! : years[1]?.id ?? "";
  const rows = sourceYearId && targetYearId ? await listRolloverWorkspace(profile, sourceYearId, targetYearId) : [];
  return <RolloverWorkspace rows={rows} years={years} initialSourceYearId={sourceYearId} initialTargetYearId={targetYearId} />;
}
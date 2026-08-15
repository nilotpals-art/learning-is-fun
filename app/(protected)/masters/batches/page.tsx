import { redirect } from "next/navigation";

import { BatchesManager } from "@/features/batches/components/batches-manager";
import {
  listBatches,
  listBatchFormOptions,
} from "@/features/batches/services/batch-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function BatchesPage() {
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) redirect("/unauthorized");

  const [batches, options] = await Promise.all([
    listBatches(profile),
    listBatchFormOptions(profile),
  ]);
  return <BatchesManager batches={batches} options={options} />;
}

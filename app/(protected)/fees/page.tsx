import { redirect } from "next/navigation";
import { FeesOverview } from "@/features/fees/components/fees-manager";
import { getFeeSummary } from "@/features/fees/services/fee-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";
export default async function FeesPage(){const p=await requireRole(DASHBOARD_ROLES);if(!p.instituteId)redirect("/unauthorized");return <FeesOverview summary={await getFeeSummary(p)}/>}

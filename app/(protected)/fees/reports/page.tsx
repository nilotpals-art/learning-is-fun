import { FeesOverview } from "@/features/fees/components/fees-manager";import { getFeeSummary } from "@/features/fees/services/fee-service";import { requireRole } from "@/lib/auth/services/auth-service";import { DASHBOARD_ROLES } from "@/lib/navigation";
export default async function Page(){const p=await requireRole(DASHBOARD_ROLES);return <FeesOverview summary={await getFeeSummary(p)}/>}

import { FeeStructuresManager } from "@/features/fees/components/fee-structures-manager";
import { getFeeStructureOptions,listFeeStructures } from "@/features/fees/services/fee-structure-service";
import { requireRole } from "@/lib/auth/services/auth-service";import { DASHBOARD_ROLES } from "@/lib/navigation";
export default async function Page(){const profile=await requireRole(DASHBOARD_ROLES);const[structures,options]=await Promise.all([listFeeStructures(profile),getFeeStructureOptions(profile)]);return <FeeStructuresManager structures={structures} years={options.academicYears} classes={options.classes} heads={options.feeHeads}/>}

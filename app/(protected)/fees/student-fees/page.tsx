import { redirect } from "next/navigation";
import { StudentFeesManager } from "@/features/fees/components/fees-manager";
import { getFeeReferenceData, listFeeDues } from "@/features/fees/services/fee-service";
import { requireRole } from "@/lib/auth/services/auth-service";import { DASHBOARD_ROLES } from "@/lib/navigation";
export default async function Page(){const p=await requireRole(DASHBOARD_ROLES);if(!p.instituteId)redirect("/unauthorized");const [refs,dues]=await Promise.all([getFeeReferenceData(p),listFeeDues(p)]);return <StudentFeesManager students={refs.students} years={refs.academicYears} heads={refs.feeHeads} dues={dues}/>}

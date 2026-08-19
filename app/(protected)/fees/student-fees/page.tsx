import { redirect } from "next/navigation";
import { StudentFeesManager } from "@/features/fees/components/fees-manager";
import { SecurityDepositManager } from "@/features/fees/components/security-deposit-manager";
import { getFeeReferenceData, listFeeDues, listSecurityDeposits } from "@/features/fees/services/fee-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function Page(){
  const p=await requireRole(DASHBOARD_ROLES); if(!p.instituteId)redirect("/unauthorized");
  const [refs,dues,deposits]=await Promise.all([getFeeReferenceData(p),listFeeDues(p),listSecurityDeposits(p)]);
  return <div className="space-y-8"><StudentFeesManager students={refs.students} years={refs.academicYears} heads={refs.feeHeads} dues={dues}/><SecurityDepositManager balances={deposits.balances} entries={deposits.entries} dues={dues}/></div>;
}

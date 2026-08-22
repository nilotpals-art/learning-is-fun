import { Link2 } from "lucide-react";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { getFeeStructureOptions } from "@/features/fees/services/fee-structure-service";
import { AdminEnrollmentLinks } from "@/features/student-enrollment/components/admin-enrollment-links";
import { listEnrollmentInvites } from "@/features/student-enrollment/services/enrollment-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function EnrollmentLinksPage() {
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) redirect("/unauthorized");
  const [options, invites] = await Promise.all([
    getFeeStructureOptions(profile),
    listEnrollmentInvites(profile.instituteId),
  ]);
  return <div className="space-y-6">
    <PageHeader title="Parent Enrollment Links" description="Create a secure form link for a parent's WhatsApp number. The mobile number and configured fees are locked for parents." icon={Link2} theme="students" />
    <AdminEnrollmentLinks academicYears={options.academicYears} classes={options.classes} invites={invites as unknown as Record<string, unknown>[]} />
  </div>;
}

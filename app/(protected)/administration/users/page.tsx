import { PageHeader } from "@/components/layout/page-header";
import { StaffManager } from "@/features/user-management/components/staff-manager";
import { UserManager } from "@/features/user-management/components/user-manager";
import { listManagedAdministrators, listManagedBranches, listManagedStaff } from "@/features/user-management/services/user-management-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { ADMINISTRATOR_ROLES, isSuperAdmin } from "@/lib/auth/roles";

export default async function Page() {
  const profile = await requireRole(ADMINISTRATOR_ROLES);
  const [staff, branches, administrators] = await Promise.all([
    listManagedStaff(profile),
    listManagedBranches(profile),
    isSuperAdmin(profile.role) ? listManagedAdministrators(profile) : Promise.resolve([]),
  ]);

  return <div className="space-y-8">
    <PageHeader title="User Management" description="Create Teacher and Accountant OTP logins and control their ERP module access. Super Admin can also manage Administrators." />
    <StaffManager users={staff} branches={branches} />
    {isSuperAdmin(profile.role) ? <UserManager users={administrators} branches={branches} /> : null}
  </div>;
}

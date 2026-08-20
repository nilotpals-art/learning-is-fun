import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { normalizeEmail } from "@/lib/validation/normalization";
import type { AuthProfile, SupportedRole } from "@/features/auth/types/auth";
import { ADMINISTRATOR_ROLES, isStaffRole, normalizeApplicationRole, ROLE } from "@/lib/auth/roles";
import type { PermissionCode } from "@/lib/auth/permissions";

const ROLE_DESTINATIONS: Readonly<Record<SupportedRole, string>> = {
  [ROLE.ADMINISTRATOR]: "/dashboard",
  [ROLE.SUPER_ADMIN]: "/dashboard",
  [ROLE.INSTITUTE_ADMIN]: "/dashboard",
  [ROLE.STUDENT]: "/student/dashboard",
  [ROLE.PARENT]: "/parent/dashboard",
  [ROLE.STAFF]: "/unauthorized",
  [ROLE.TEACHER]: "/dashboard",
  [ROLE.ACCOUNTANT]: "/dashboard",
};

interface ProfileRecord {
  id: string;
  user_id: string | null;
  email: string | null;
  name: string;
  role: string | null;
  is_active: boolean | null;
  institute_id: string | null;
  branch_id: string | null;
  role_record: { name: string } | Array<{ name: string }> | null;
  institute_record: { name: string; short_name: string | null; logo_url: string | null } | Array<{ name: string; short_name: string | null; logo_url: string | null }> | null;
}

function getRelatedRole(value: ProfileRecord["role_record"]): string | null {
  return Array.isArray(value) ? value[0]?.name ?? null : value?.name ?? null;
}

function toAuthProfile(record: ProfileRecord): AuthProfile {
  const institute = Array.isArray(record.institute_record) ? record.institute_record[0] ?? null : record.institute_record;
  return {
    id: record.id,
    userId: record.user_id,
    email: record.email,
    name: record.name,
    role: normalizeApplicationRole(record.role ?? getRelatedRole(record.role_record)),
    isActive: record.is_active === true,
    instituteId: record.institute_id,
    branchId: record.branch_id,
    instituteName: institute?.name ?? null,
    instituteShortName: institute?.short_name ?? null,
    instituteLogoUrl: institute?.logo_url ?? null,
  };
}

export function getRoleDestination(role: string | null): string {
  const normalizedRole = normalizeApplicationRole(role);
  return normalizedRole && normalizedRole in ROLE_DESTINATIONS ? ROLE_DESTINATIONS[normalizedRole] : "/unauthorized";
}

export async function findAuthorizedProfileByEmail(email: string): Promise<Pick<AuthProfile, "id" | "isActive"> | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("pre_otp_profile_status", {
    p_email: normalizeEmail(email),
  });

  if (error || data === "not_found" || (data !== "active" && data !== "inactive")) return null;
  return { id: "pre-otp-authorized", isActive: data === "active" };
}

export async function getCurrentProfile(): Promise<AuthProfile | null> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const { data: sessionIsActive, error: sessionError } = await supabase.rpc("is_current_auth_session_active");
  if (sessionError || sessionIsActive !== true) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, user_id, email, name, role, is_active, institute_id, branch_id, role_record:roles(name), institute_record:institutes(name, short_name, logo_url)")
    .or(`id.eq.${user.id},user_id.eq.${user.id}`).limit(1).maybeSingle();
  return error || !data ? null : toAuthProfile(data as ProfileRecord);
}

export async function getCurrentPermissionCodes(): Promise<PermissionCode[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("current_user_permission_codes");
  if (error || !Array.isArray(data)) return [];
  return data.filter((value): value is PermissionCode => typeof value === "string") as PermissionCode[];
}

export async function requireAuth(): Promise<AuthProfile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.isActive) redirect("/inactive");
  return profile;
}

export async function requirePermission(permission: PermissionCode): Promise<AuthProfile> {
  const profile = await requireAuth();
  if (!isStaffRole(profile.role)) return profile;
  const permissions = await getCurrentPermissionCodes();
  if (!permissions.includes(permission)) redirect("/unauthorized");
  return profile;
}

export async function requireRole(allowedRoles: readonly string[]): Promise<AuthProfile> {
  const profile = await requireAuth();
  const normalized = normalizeApplicationRole(profile.role);
  const allowed = allowedRoles.map(normalizeApplicationRole);
  if (normalized && allowed.includes(normalized)) return profile;

  const acceptsAdministrator = ADMINISTRATOR_ROLES.some((role) => allowed.includes(role));
  if (isStaffRole(profile.role) && acceptsAdministrator) {
    const permissions = await getCurrentPermissionCodes();
    if (permissions.length > 0) return profile;
  }

  redirect("/unauthorized");
}

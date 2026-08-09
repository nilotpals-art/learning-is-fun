import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { normalizeEmail } from "@/lib/validation/normalization";
import type { AuthProfile, SupportedRole } from "@/features/auth/types/auth";

const ROLE_DESTINATIONS: Readonly<Record<SupportedRole, string>> = {
  admin: "/dashboard",
  "Super Admin": "/dashboard",
  "Institute Admin": "/dashboard",
  Student: "/student/dashboard",
  Parent: "/parent/dashboard",
  Staff: "/unauthorized",
  Teacher: "/unauthorized",
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
  institute_record:
    | { name: string; short_name: string | null; logo_url: string | null }
    | Array<{ name: string; short_name: string | null; logo_url: string | null }>
    | null;
}

function getRelatedRole(
  value: ProfileRecord["role_record"]
): string | null {
  if (Array.isArray(value)) {
    return value[0]?.name ?? null;
  }

  return value?.name ?? null;
}

function toAuthProfile(record: ProfileRecord): AuthProfile {
  const institute = Array.isArray(record.institute_record)
    ? record.institute_record[0] ?? null
    : record.institute_record;

  return {
    id: record.id,
    userId: record.user_id,
    email: record.email,
    name: record.name,
    role: record.role ?? getRelatedRole(record.role_record),
    isActive: record.is_active === true,
    instituteId: record.institute_id,
    branchId: record.branch_id,
    instituteName: institute?.name ?? null,
    instituteShortName: institute?.short_name ?? null,
    instituteLogoUrl: institute?.logo_url ?? null,
  };
}

export function getRoleDestination(role: string | null): string {
  if (role && role in ROLE_DESTINATIONS) {
    return ROLE_DESTINATIONS[role as SupportedRole];
  }

  return "/unauthorized";
}

export async function findAuthorizedProfileByEmail(
  email: string
): Promise<Pick<AuthProfile, "id" | "isActive"> | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, is_active")
    .eq("email", normalizeEmail(email))
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return { id: data.id as string, isActive: data.is_active === true };
}

export async function getCurrentProfile(): Promise<AuthProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, user_id, email, name, role, is_active, institute_id, branch_id, role_record:roles(name), institute_record:institutes(name, short_name, logo_url)"
    )
    .or(`id.eq.${user.id},user_id.eq.${user.id}`)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return toAuthProfile(data as ProfileRecord);
}

export async function requireAuth(): Promise<AuthProfile> {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  if (!profile.isActive) {
    redirect("/inactive");
  }

  return profile;
}

export async function requireRole(
  allowedRoles: readonly string[]
): Promise<AuthProfile> {
  const profile = await requireAuth();

  if (!profile.role || !allowedRoles.includes(profile.role)) {
    redirect("/unauthorized");
  }

  return profile;
}

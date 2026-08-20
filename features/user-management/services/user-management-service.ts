import "server-only";

import type { AuthProfile } from "@/features/auth/types/auth";
import type { ManagedAdministrator, ManagedBranch, ManagedStaff } from "@/features/user-management/types/user-management";
import { AdminAuthConfigurationError, AdminAuthOperationError, createManagedAuthUser, deleteManagedAuthUser, findManagedAuthUserByEmail } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isAdministratorRole, isSuperAdmin } from "@/lib/auth/roles";

function institute(profile: AuthProfile) {
  if (!isAdministratorRole(profile.role) || !profile.instituteId) throw new Error("USER_MANAGEMENT_UNAUTHORIZED");
  return profile.instituteId;
}

const one = <T,>(value: T | T[] | null): T | null => Array.isArray(value) ? value[0] ?? null : value;

export async function listManagedAdministrators(profile: AuthProfile): Promise<ManagedAdministrator[]> {
  if (!isSuperAdmin(profile.role)) return [];
  const db = await createClient();
  const { data, error } = await db.from("profiles").select("id,name,email,mobile,branch_id,is_active,user_id,created_at,branch:branches(name)").eq("institute_id", institute(profile)).eq("role", "admin").order("name");
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, name: row.name, email: row.email ?? "", mobile: row.mobile, branchId: row.branch_id, branchName: one(row.branch)?.name ?? null, isActive: row.is_active === true, authLinked: row.id === row.user_id || row.user_id !== null, createdAt: row.created_at ?? "" }));
}

export async function listManagedBranches(profile: AuthProfile): Promise<ManagedBranch[]> {
  const db = await createClient();
  const { data, error } = await db.from("branches").select("id,name").eq("institute_id", institute(profile)).order("name");
  if (error) throw error;
  return data ?? [];
}

export async function listManagedStaff(profile: AuthProfile): Promise<ManagedStaff[]> {
  institute(profile);
  const db = await createClient();
  const { data, error } = await db.rpc("list_managed_staff");
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id), name: String(row.name ?? ""), email: String(row.email ?? ""), mobile: String(row.mobile ?? ""),
    branchId: row.branch_id ? String(row.branch_id) : null, branchName: row.branch_name ? String(row.branch_name) : null,
    role: row.role === "Accountant" ? "Accountant" : "Teacher", isActive: row.is_active === true,
    authLinked: Boolean(row.user_id), createdAt: String(row.created_at ?? ""),
    permissionCodes: Array.isArray(row.permission_codes) ? row.permission_codes.filter((value): value is string => typeof value === "string") : [],
  }));
}

async function createAuthIdentity(email: string) {
  let existing;
  try { existing = await findManagedAuthUserByEmail(email); }
  catch (error) {
    if (error instanceof AdminAuthConfigurationError || error instanceof AdminAuthOperationError) throw new Error("USER_MANAGEMENT_CONFIGURATION");
    throw error;
  }
  if (existing) throw new Error("USER_MANAGEMENT_EMAIL_CONFLICT");
  try { return await createManagedAuthUser(email); }
  catch (error) {
    if (error instanceof AdminAuthConfigurationError) throw new Error("USER_MANAGEMENT_CONFIGURATION");
    if (error instanceof AdminAuthOperationError) throw new Error(error.code);
    throw error;
  }
}

export async function createAdministrator(profile: AuthProfile, input: {name:string;email:string;mobile:string;branchId:string|null;isActive:boolean}) {
  if (!isSuperAdmin(profile.role)) throw new Error("USER_MANAGEMENT_UNAUTHORIZED");
  institute(profile);
  const auth = await createAuthIdentity(input.email);
  const db = await createClient();
  const { data, error } = await db.rpc("finalize_administrator_identity", { p_auth_user_id: auth.id, p_email: input.email, p_name: input.name, p_mobile: input.mobile, p_branch_id: input.branchId, p_is_active: input.isActive });
  if (error) { try { await deleteManagedAuthUser(auth.id); } catch { throw new Error("USER_MANAGEMENT_RECONCILIATION"); } throw error; }
  return data as string;
}

export async function updateAdministrator(profile: AuthProfile, input: {id:string;name:string;mobile:string;branchId:string|null;isActive:boolean}) {
  if (!isSuperAdmin(profile.role)) throw new Error("USER_MANAGEMENT_UNAUTHORIZED");
  institute(profile);
  const db = await createClient();
  const { error } = await db.rpc("update_managed_administrator", { p_profile_id: input.id, p_name: input.name, p_mobile: input.mobile, p_branch_id: input.branchId, p_is_active: input.isActive });
  if (error) throw error;
}

export async function createStaff(profile: AuthProfile, input: {name:string;email:string;mobile:string;branchId:string|null;role:"Teacher"|"Accountant";isActive:boolean;permissionCodes:string[]}) {
  institute(profile);
  const auth = await createAuthIdentity(input.email);
  const db = await createClient();
  const { data, error } = await db.rpc("finalize_staff_identity", { p_auth_user_id: auth.id, p_email: input.email, p_name: input.name, p_mobile: input.mobile, p_branch_id: input.branchId, p_role: input.role, p_is_active: input.isActive, p_permission_codes: input.permissionCodes });
  if (error) { try { await deleteManagedAuthUser(auth.id); } catch { throw new Error("USER_MANAGEMENT_RECONCILIATION"); } throw error; }
  return data as string;
}

export async function updateStaff(profile: AuthProfile, input: {id:string;name:string;mobile:string;branchId:string|null;role:"Teacher"|"Accountant";isActive:boolean;permissionCodes:string[]}) {
  institute(profile);
  const db = await createClient();
  const { error } = await db.rpc("update_managed_staff", { p_profile_id: input.id, p_name: input.name, p_mobile: input.mobile, p_branch_id: input.branchId, p_role: input.role, p_is_active: input.isActive, p_permission_codes: input.permissionCodes });
  if (error) throw error;
}

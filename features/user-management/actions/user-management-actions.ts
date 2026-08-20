"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/services/auth-service";
import { createAdministrator, createStaff, updateAdministrator, updateStaff } from "@/features/user-management/services/user-management-service";
import { createAdministratorSchema, createStaffSchema, updateAdministratorSchema, updateStaffSchema } from "@/features/user-management/validations/user-schema";
import type { UserManagementResult } from "@/features/user-management/types/user-management";
import { ADMINISTRATOR_ROLES, ROLE } from "@/lib/auth/roles";

const message = (error: unknown) => {
  const value = error instanceof Error ? error.message : "";
  if (value.includes("EMAIL_CONFLICT") || value.includes("email")) return "An account already uses this email.";
  if (value.includes("BRANCH_INVALID")) return "Select a branch from your institute.";
  if (value.includes("SELF_DEACTIVATION")) return "You cannot deactivate your own Super Admin account.";
  if (value.includes("CONFIGURATION")) return "User provisioning is not configured.";
  if (value.includes("RECONCILIATION")) return "Account provisioning requires manual reconciliation.";
  if (value.includes("UNAUTHORIZED")) return "You are not authorised to manage this account.";
  return "We could not update this user account.";
};

export async function createAdministratorAction(input: unknown): Promise<UserManagementResult> {
  const parsed = createAdministratorSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Correct the Administrator fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  const profile = await requireRole([ROLE.SUPER_ADMIN]);
  try {
    const id = await createAdministrator(profile, parsed.data);
    revalidatePath("/administration/users");
    return { status: "success", message: "Administrator account created. Email OTP login is ready.", id };
  } catch (error) { return { status: "error", message: message(error) }; }
}

export async function updateAdministratorAction(input: unknown): Promise<UserManagementResult> {
  const parsed = updateAdministratorSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Correct the Administrator fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  const profile = await requireRole([ROLE.SUPER_ADMIN]);
  try {
    await updateAdministrator(profile, parsed.data);
    revalidatePath("/administration/users");
    return { status: "success", message: "Administrator account updated." };
  } catch (error) { return { status: "error", message: message(error) }; }
}

export async function createStaffAction(input: unknown): Promise<UserManagementResult> {
  const parsed = createStaffSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Correct the staff account fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  const profile = await requireRole(ADMINISTRATOR_ROLES);
  try {
    const id = await createStaff(profile, parsed.data);
    revalidatePath("/administration/users");
    return { status: "success", message: `${parsed.data.role} account created. Email OTP login is ready.`, id };
  } catch (error) { return { status: "error", message: message(error) }; }
}

export async function updateStaffAction(input: unknown): Promise<UserManagementResult> {
  const parsed = updateStaffSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Correct the staff account fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  const profile = await requireRole(ADMINISTRATOR_ROLES);
  try {
    await updateStaff(profile, parsed.data);
    revalidatePath("/administration/users");
    return { status: "success", message: `${parsed.data.role} account updated.` };
  } catch (error) { return { status: "error", message: message(error) }; }
}

import "server-only";

import { z } from "zod";

import type {
  AssessParentReuseInput,
  IdentityProvisioningResult,
  ParentReuseAssessment,
  ProvisionParentIdentityInput,
  ProvisionStudentIdentityInput,
  ProvisioningConflictCode,
} from "@/features/auth/types/provisioning";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";
import {
  AdminAuthConfigurationError,
  AdminAuthOperationError,
  createManagedAuthUser,
  deleteManagedAuthUser,
  findManagedAuthUserByEmail,
  getManagedAuthUserById,
  type ManagedAuthUser,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { normalizeEmail, normalizeTrimmedText, normalizeUpperText } from "@/lib/validation/normalization";

const emailSchema = z.string().trim().email().transform(normalizeEmail);
const idSchema = z.string().uuid();

interface StudentIdentityRecord {
  id: string;
  email: string;
  profile_id: string | null;
}

interface ParentIdentityRecord {
  id: string;
  name: string;
  mobile: string;
  email: string;
  profile_id: string | null;
}

interface DatabaseError {
  message?: string;
}

function conflict(
  code: ProvisioningConflictCode,
  message: string
): IdentityProvisioningResult {
  return { status: "conflict", code, message };
}

function databaseConflict(error: unknown): IdentityProvisioningResult | null {
  const message = (error as DatabaseError).message ?? "";
  if (message.includes("PROVISIONING_EMAIL_MISMATCH")) {
    return conflict("email_mismatch", "The submitted email no longer matches the domain record.");
  }
  if (message.includes("PROVISIONING_DOMAIN_ALREADY_LINKED")) {
    return conflict("domain_already_linked", "This record is already linked to another identity.");
  }
  if (message.includes("PROVISIONING_PROFILE_CONFLICT")) {
    return conflict("profile_conflict", "An incompatible Profile already uses this identity.");
  }
  if (message.includes("PROVISIONING_AUTH_IDENTITY_MISMATCH")) {
    return conflict("identity_integrity_conflict", "The Auth identity does not match this record.");
  }
  return null;
}

function configurationError(): IdentityProvisioningResult {
  return {
    status: "error",
    code: "configuration_error",
    message: "Identity provisioning is not configured. Contact the system administrator.",
  };
}

async function compensateCreatedUser(
  user: ManagedAuthUser,
  domainType: "student" | "parent",
  domainId: string
): Promise<IdentityProvisioningResult> {
  try {
    await deleteManagedAuthUser(user.id);
    return {
      status: "error",
      code: "provisioning_failed",
      message: "Identity provisioning could not be completed. No account was retained.",
    };
  } catch (error) {
    console.error("Identity provisioning compensation failed", {
      domainType,
      domainId,
      authUserId: user.id,
      errorCode: error instanceof AdminAuthOperationError ? error.code : "unknown",
    });
    return {
      status: "error",
      code: "manual_reconciliation_required",
      message: "Identity provisioning requires manual reconciliation. Contact the system administrator.",
    };
  }
}

async function resolveAuthIdentity(
  profileId: string | null,
  email: string
): Promise<
  | { status: "ready"; user: ManagedAuthUser; created: boolean }
  | { status: "result"; result: IdentityProvisioningResult }
> {
  if (profileId) {
    const user = await getManagedAuthUserById(profileId);
    if (!user || user.email !== email) {
      return {
        status: "result",
        result: conflict("identity_integrity_conflict", "The linked Auth identity is missing or incompatible."),
      };
    }
    return { status: "ready", user, created: false };
  }

  if (await findManagedAuthUserByEmail(email)) {
    return {
      status: "result",
      result: conflict("auth_email_conflict", "An unlinked or incompatible Auth account already uses this email."),
    };
  }

  return { status: "ready", user: await createManagedAuthUser(email), created: true };
}

async function authenticatedInstituteId(): Promise<string> {
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) throw new Error("Administrator institute is missing.");
  return profile.instituteId;
}

export async function provisionStudentIdentity(
  input: ProvisionStudentIdentityInput
): Promise<IdentityProvisioningResult> {
  const studentId = idSchema.safeParse(input.studentId);
  const email = emailSchema.safeParse(input.email);
  if (!studentId.success || !email.success) {
    return { status: "error", code: "provisioning_failed", message: "Invalid Student identity details." };
  }

  const instituteId = await authenticatedInstituteId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select("id, email, profile_id")
    .eq("id", studentId.data)
    .eq("institute_id", instituteId)
    .maybeSingle();
  if (error) return { status: "error", code: "provisioning_failed", message: "Student identity validation failed." };
  if (!data) return { status: "error", code: "not_found", message: "Student not found." };

  const student = data as StudentIdentityRecord;
  if (normalizeEmail(student.email) !== email.data) return conflict("email_mismatch", "The submitted email does not match the Student record.");

  let auth: Awaited<ReturnType<typeof resolveAuthIdentity>>;
  try {
    auth = await resolveAuthIdentity(student.profile_id, email.data);
  } catch (authError) {
    if (authError instanceof AdminAuthConfigurationError) return configurationError();
    if (authError instanceof AdminAuthOperationError && authError.status === 401) {
      return configurationError();
    }
    if (authError instanceof AdminAuthOperationError && authError.code.includes("email")) {
      return conflict("auth_email_conflict", "An Auth account already uses this email.");
    }
    return { status: "error", code: "provisioning_failed", message: "Student Auth provisioning failed." };
  }
  if (auth.status === "result") return auth.result;

  const { data: outcome, error: finalizeError } = await supabase.rpc("finalize_student_identity", {
    p_student_id: student.id,
    p_auth_user_id: auth.user.id,
    p_email: email.data,
  });
  if (finalizeError) {
    if (auth.created) return compensateCreatedUser(auth.user, "student", student.id);
    return databaseConflict(finalizeError) ?? { status: "error", code: "provisioning_failed", message: "Student identity could not be finalized." };
  }

  return outcome === "reused"
    ? { status: "reused", message: "Student identity is already provisioned." }
    : { status: "created", message: "Student identity provisioned." };
}

export async function provisionParentIdentity(
  input: ProvisionParentIdentityInput
): Promise<IdentityProvisioningResult> {
  const parentId = idSchema.safeParse(input.parentId);
  const studentId = input.studentId ? idSchema.safeParse(input.studentId) : null;
  const email = emailSchema.safeParse(input.email);
  if (!parentId.success || !email.success || (studentId && !studentId.success)) {
    return { status: "error", code: "provisioning_failed", message: "Invalid Parent identity details." };
  }
  if (input.studentId && !input.relationship?.trim()) {
    return { status: "error", code: "provisioning_failed", message: "Parent relationship is required." };
  }

  const instituteId = await authenticatedInstituteId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parents")
    .select("id, name, mobile, email, profile_id")
    .eq("id", parentId.data)
    .eq("institute_id", instituteId)
    .maybeSingle();
  if (error) return { status: "error", code: "provisioning_failed", message: "Parent identity validation failed." };
  if (!data) return { status: "error", code: "not_found", message: "Parent not found." };

  const parent = data as ParentIdentityRecord;
  if (normalizeEmail(parent.email) !== email.data) return conflict("email_mismatch", "The submitted email does not match the Parent record.");

  let auth: Awaited<ReturnType<typeof resolveAuthIdentity>>;
  try {
    auth = await resolveAuthIdentity(parent.profile_id, email.data);
  } catch (authError) {
    if (authError instanceof AdminAuthConfigurationError) return configurationError();
    if (authError instanceof AdminAuthOperationError && authError.status === 401) {
      return configurationError();
    }
    if (authError instanceof AdminAuthOperationError && authError.code.includes("email")) {
      return conflict("auth_email_conflict", "An Auth account already uses this email.");
    }
    return { status: "error", code: "provisioning_failed", message: "Parent Auth provisioning failed." };
  }
  if (auth.status === "result") return auth.result;

  const { data: outcome, error: finalizeError } = await supabase.rpc("finalize_parent_identity", {
    p_parent_id: parent.id,
    p_auth_user_id: auth.user.id,
    p_email: email.data,
    p_student_id: studentId?.success ? studentId.data : null,
    p_relationship: input.relationship?.trim() ?? null,
  });
  if (finalizeError) {
    if (auth.created) return compensateCreatedUser(auth.user, "parent", parent.id);
    return databaseConflict(finalizeError) ?? { status: "error", code: "provisioning_failed", message: "Parent identity could not be finalized." };
  }

  return outcome === "reused"
    ? { status: "reused", message: "Parent identity reused safely." }
    : { status: "created", message: "Parent identity provisioned." };
}

export async function assessParentReuse(
  input: AssessParentReuseInput
): Promise<ParentReuseAssessment> {
  const email = emailSchema.safeParse(input.email);
  if (!email.success) return { status: "not_found" };
  const instituteId = await authenticatedInstituteId();
  const supabase = await createClient();
  const { data } = await supabase
    .from("parents")
    .select("id, name, mobile, email, profile_id")
    .eq("institute_id", instituteId)
    .eq("email", email.data)
    .maybeSingle();
  if (!data) return { status: "not_found" };

  const parent = data as ParentIdentityRecord;
  const submittedName = normalizeUpperText(input.name);
  const submittedMobile = normalizeTrimmedText(input.mobile);
  if (normalizeUpperText(parent.name) === submittedName && normalizeTrimmedText(parent.mobile) === submittedMobile) {
    return { status: "reuse", parentId: parent.id };
  }

  const { count } = await supabase
    .from("student_parent_links")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", parent.id)
    .eq("institute_id", instituteId);
  return {
    status: "conflict",
    parentId: parent.id,
    comparison: {
      existingName: parent.name,
      existingMobile: parent.mobile,
      submittedName,
      submittedMobile,
      linkedChildCount: count ?? 0,
    },
  };
}

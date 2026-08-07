"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  findFeeHeadDuplicates,
  getInstituteFeeHeadSetupState,
  getFeeHead,
  insertFeeHead,
  insertRecommendedFeeHeads,
  updateFeeHeadRecord,
} from "@/features/fee-heads/services/fee-head-service";
import type { FeeHeadActionResult } from "@/features/fee-heads/types/fee-head";
import {
  feeHeadIdSchema,
  feeHeadSchema,
} from "@/features/fee-heads/validations/fee-head-schema";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

const PATH = "/masters/fee-heads";
const NAME_DUPLICATE = "A Fee Head with this name already exists.";
const CODE_DUPLICATE = "A Fee Head with this code already exists.";

interface DatabaseError {
  code?: string;
  message?: string;
  details?: string;
}

export async function createInitialFeeHeads(): Promise<FeeHeadActionResult> {
  const instituteId = await requireInstituteId();
  try {
    const state = await getInstituteFeeHeadSetupState(instituteId);
    if (state.conflicts.length > 0) {
      return {
        status: "error",
        message: `Resolve these conflicts before setup: ${state.conflicts.join(" ")}`,
      };
    }
    if (state.complete) {
      return { status: "success", message: "Initial Fee Heads are already set up." };
    }

    const created = await insertRecommendedFeeHeads(instituteId, state);
    revalidatePath(PATH);
    return {
      status: "success",
      message: `Created ${created} initial Fee Head${created === 1 ? "" : "s"}.`,
    };
  } catch (error) {
    const database = error as DatabaseError;
    if (database.code === "23505") {
      const latest = await getInstituteFeeHeadSetupState(instituteId);
      if (latest.complete) {
        revalidatePath(PATH);
        return { status: "success", message: "Initial Fee Heads are already set up." };
      }
      if (latest.conflicts.length > 0) {
        return {
          status: "error",
          message: `Setup stopped because a conflict was detected: ${latest.conflicts.join(" ")}`,
        };
      }
    }
    return { status: "error", message: "We could not create the initial Fee Heads. Please try again." };
  }
}

async function requireInstituteId(): Promise<string> {
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) redirect("/unauthorized");
  return profile.instituteId;
}

function duplicateResult(field: "name" | "code"): FeeHeadActionResult {
  const message = field === "name" ? NAME_DUPLICATE : CODE_DUPLICATE;
  return { status: "error", message, fieldErrors: { [field]: [message] } };
}

function databaseError(error: unknown): FeeHeadActionResult {
  const database = error as DatabaseError;
  if (database.code === "23505") {
    const detail = `${database.message ?? ""} ${database.details ?? ""}`;
    if (detail.includes("fee_heads_institute_id_code_key")) {
      return duplicateResult("code");
    }
    if (detail.includes("fee_heads_institute_id_name_key")) {
      return duplicateResult("name");
    }
    return {
      status: "error",
      message: "A Fee Head with this name or code already exists.",
    };
  }
  return {
    status: "error",
    message: "We could not save the Fee Head. Please try again.",
  };
}

export async function createFeeHead(
  input: unknown
): Promise<FeeHeadActionResult> {
  const parsed = feeHeadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const instituteId = await requireInstituteId();
  try {
    const duplicates = await findFeeHeadDuplicates(
      instituteId,
      parsed.data.name,
      parsed.data.code
    );
    if (duplicates.name) return duplicateResult("name");
    if (duplicates.code) return duplicateResult("code");
    await insertFeeHead(instituteId, parsed.data);
    revalidatePath(PATH);
    return { status: "success", message: "Fee Head created." };
  } catch (error) {
    return databaseError(error);
  }
}

export async function updateFeeHead(
  idInput: unknown,
  input: unknown
): Promise<FeeHeadActionResult> {
  const id = feeHeadIdSchema.safeParse(idInput);
  const values = feeHeadSchema.safeParse(input);
  if (!id.success || !values.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: values.success ? undefined : values.error.flatten().fieldErrors,
    };
  }

  const instituteId = await requireInstituteId();
  try {
    if (!(await getFeeHead(instituteId, id.data))) {
      return { status: "error", message: "Fee Head not found." };
    }
    const duplicates = await findFeeHeadDuplicates(
      instituteId,
      values.data.name,
      values.data.code,
      id.data
    );
    if (duplicates.name) return duplicateResult("name");
    if (duplicates.code) return duplicateResult("code");
    const updated = await updateFeeHeadRecord(instituteId, id.data, values.data);
    if (!updated) return { status: "error", message: "Fee Head not found." };
    revalidatePath(PATH);
    return { status: "success", message: "Fee Head updated." };
  } catch (error) {
    return databaseError(error);
  }
}

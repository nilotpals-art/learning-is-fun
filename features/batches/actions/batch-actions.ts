"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  batchHasStudentReferences,
  batchNameExists,
  batchRelationsBelongToInstitute,
  deleteBatchRecord,
  getBatch,
  insertBatch,
  updateBatchRecord,
} from "@/features/batches/services/batch-service";
import type { BatchActionResult } from "@/features/batches/types/batch";
import {
  batchIdSchema,
  batchSchema,
} from "@/features/batches/validations/batch-schema";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

const PATH = "/masters/batches";
const DUPLICATE_MESSAGE = "A Batch with this name already exists in your institute.";
const IN_USE_MESSAGE = "This Batch is in use and cannot be deleted.";

interface DatabaseError {
  code?: string;
}

async function requireInstituteId(): Promise<string> {
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) redirect("/unauthorized");
  return profile.instituteId;
}

function saveError(): BatchActionResult {
  return { status: "error", message: "We could not save the Batch. Please try again." };
}

export async function createBatch(input: unknown): Promise<BatchActionResult> {
  const parsed = batchSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const instituteId = await requireInstituteId();
  try {
    if (await batchNameExists(instituteId, parsed.data.name)) {
      return { status: "error", message: DUPLICATE_MESSAGE };
    }
    if (!(await batchRelationsBelongToInstitute(instituteId, parsed.data))) {
      return { status: "error", message: "One or more selected records are unavailable." };
    }
    await insertBatch(instituteId, parsed.data);
    revalidatePath(PATH);
    return { status: "success", message: "Batch created." };
  } catch {
    return saveError();
  }
}

export async function updateBatch(
  idInput: unknown,
  input: unknown
): Promise<BatchActionResult> {
  const id = batchIdSchema.safeParse(idInput);
  const values = batchSchema.safeParse(input);
  if (!id.success || !values.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: values.success ? undefined : values.error.flatten().fieldErrors,
    };
  }

  const instituteId = await requireInstituteId();
  try {
    if (!(await getBatch(instituteId, id.data))) {
      return { status: "error", message: "Batch not found." };
    }
    if (await batchNameExists(instituteId, values.data.name, id.data)) {
      return { status: "error", message: DUPLICATE_MESSAGE };
    }
    if (!(await batchRelationsBelongToInstitute(instituteId, values.data))) {
      return { status: "error", message: "One or more selected records are unavailable." };
    }
    const updated = await updateBatchRecord(instituteId, id.data, values.data);
    if (!updated) return { status: "error", message: "Batch not found." };
    revalidatePath(PATH);
    return { status: "success", message: "Batch updated." };
  } catch {
    return saveError();
  }
}

export async function deleteBatch(idInput: unknown): Promise<BatchActionResult> {
  const id = batchIdSchema.safeParse(idInput);
  if (!id.success) return { status: "error", message: "Batch not found." };

  const instituteId = await requireInstituteId();
  try {
    const existing = await getBatch(instituteId, id.data);
    if (!existing) return { status: "error", message: "Batch not found." };
    if (await batchHasStudentReferences(id.data)) {
      return { status: "error", message: IN_USE_MESSAGE };
    }
    const deleted = await deleteBatchRecord(instituteId, id.data);
    if (!deleted) return { status: "error", message: "Batch not found." };
    revalidatePath(PATH);
    return { status: "success", message: "Batch permanently deleted." };
  } catch (error) {
    if ((error as DatabaseError)?.code === "23503") {
      return { status: "error", message: IN_USE_MESSAGE };
    }
    return { status: "error", message: "We could not delete the Batch. Please try again." };
  }
}

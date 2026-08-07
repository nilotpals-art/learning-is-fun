"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  academicClassNameExists,
  getAcademicClass,
  insertAcademicClass,
  updateAcademicClassRecord,
} from "@/features/classes/services/class-service";
import type { AcademicClassActionResult } from "@/features/classes/types/academic-class";
import {
  classIdSchema,
  classSchema,
} from "@/features/classes/validations/class-schema";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

const PATH = "/masters/classes";
const DUPLICATE_MESSAGE =
  "A Class with this name already exists in your institute.";

async function requireInstituteId(): Promise<string> {
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) redirect("/unauthorized");
  return profile.instituteId;
}

function databaseError(): AcademicClassActionResult {
  return {
    status: "error",
    message: "We could not save the Class. Please try again.",
  };
}

export async function createAcademicClass(
  input: unknown
): Promise<AcademicClassActionResult> {
  const parsed = classSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const instituteId = await requireInstituteId();
  try {
    if (await academicClassNameExists(instituteId, parsed.data.className)) {
      return { status: "error", message: DUPLICATE_MESSAGE };
    }

    await insertAcademicClass(instituteId, parsed.data);
    revalidatePath(PATH);
    return { status: "success", message: "Class created." };
  } catch {
    return databaseError();
  }
}

export async function updateAcademicClass(
  idInput: unknown,
  input: unknown
): Promise<AcademicClassActionResult> {
  const id = classIdSchema.safeParse(idInput);
  const values = classSchema.safeParse(input);
  if (!id.success || !values.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: values.success
        ? undefined
        : values.error.flatten().fieldErrors,
    };
  }

  const instituteId = await requireInstituteId();
  try {
    const existing = await getAcademicClass(instituteId, id.data);
    if (!existing) return { status: "error", message: "Class not found." };

    if (
      await academicClassNameExists(
        instituteId,
        values.data.className,
        id.data
      )
    ) {
      return { status: "error", message: DUPLICATE_MESSAGE };
    }

    const updated = await updateAcademicClassRecord(
      instituteId,
      id.data,
      values.data
    );
    if (!updated) return { status: "error", message: "Class not found." };

    revalidatePath(PATH);
    return { status: "success", message: "Class updated." };
  } catch {
    return databaseError();
  }
}

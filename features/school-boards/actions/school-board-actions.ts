"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";
import {
  getSchoolBoard,
  insertSchoolBoard,
  schoolBoardNameExists,
  updateSchoolBoardRecord,
} from "@/features/school-boards/services/school-board-service";
import type { SchoolBoardActionResult } from "@/features/school-boards/types/school-board";
import {
  schoolBoardIdSchema,
  schoolBoardSchema,
} from "@/features/school-boards/validations/school-board-schema";

const PATH = "/masters/school-boards";
const DUPLICATE_MESSAGE =
  "A School Board with this name already exists in your institute.";

async function requireInstituteId(): Promise<string> {
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) redirect("/unauthorized");
  return profile.instituteId;
}

function databaseError(): SchoolBoardActionResult {
  return {
    status: "error",
    message: "We could not save the School Board. Please try again.",
  };
}

export async function createSchoolBoard(
  input: unknown
): Promise<SchoolBoardActionResult> {
  const parsed = schoolBoardSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted field.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const instituteId = await requireInstituteId();
  try {
    if (await schoolBoardNameExists(instituteId, parsed.data.name)) {
      return { status: "error", message: DUPLICATE_MESSAGE };
    }

    await insertSchoolBoard(instituteId, parsed.data.name);
    revalidatePath(PATH);
    return { status: "success", message: "School Board created." };
  } catch {
    return databaseError();
  }
}

export async function updateSchoolBoard(
  idInput: unknown,
  input: unknown
): Promise<SchoolBoardActionResult> {
  const id = schoolBoardIdSchema.safeParse(idInput);
  const values = schoolBoardSchema.safeParse(input);
  if (!id.success || !values.success) {
    return {
      status: "error",
      message: "Please correct the highlighted field.",
      fieldErrors: values.success
        ? undefined
        : values.error.flatten().fieldErrors,
    };
  }

  const instituteId = await requireInstituteId();
  try {
    const existing = await getSchoolBoard(instituteId, id.data);
    if (!existing) {
      return { status: "error", message: "School Board not found." };
    }

    if (
      await schoolBoardNameExists(instituteId, values.data.name, id.data)
    ) {
      return { status: "error", message: DUPLICATE_MESSAGE };
    }

    const updated = await updateSchoolBoardRecord(
      instituteId,
      id.data,
      values.data.name
    );
    if (!updated) {
      return { status: "error", message: "School Board not found." };
    }

    revalidatePath(PATH);
    return { status: "success", message: "School Board updated." };
  } catch {
    return databaseError();
  }
}

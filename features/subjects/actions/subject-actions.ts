"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  deleteSubjectRecord,
  getSubject,
  insertSubject,
  subjectNameExists,
  updateSubjectRecord,
} from "@/features/subjects/services/subject-service";
import type { SubjectActionResult } from "@/features/subjects/types/subject";
import {
  subjectIdSchema,
  subjectSchema,
} from "@/features/subjects/validations/subject-schema";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

const PATH = "/masters/subjects";
const DUPLICATE_MESSAGE =
  "A Subject with this name already exists in your institute.";

async function requireInstituteId(): Promise<string> {
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) redirect("/unauthorized");
  return profile.instituteId;
}

function databaseError(): SubjectActionResult {
  return {
    status: "error",
    message: "We could not save the Subject. Please try again.",
  };
}

export async function createSubject(
  input: unknown
): Promise<SubjectActionResult> {
  const parsed = subjectSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted field.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const instituteId = await requireInstituteId();
  try {
    if (await subjectNameExists(instituteId, parsed.data.subjectName)) {
      return { status: "error", message: DUPLICATE_MESSAGE };
    }

    await insertSubject(instituteId, parsed.data.subjectName);
    revalidatePath(PATH);
    return { status: "success", message: "Subject created." };
  } catch {
    return databaseError();
  }
}

export async function updateSubject(
  idInput: unknown,
  input: unknown
): Promise<SubjectActionResult> {
  const id = subjectIdSchema.safeParse(idInput);
  const values = subjectSchema.safeParse(input);
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
    const existing = await getSubject(instituteId, id.data);
    if (!existing) return { status: "error", message: "Subject not found." };

    if (
      await subjectNameExists(
        instituteId,
        values.data.subjectName,
        id.data
      )
    ) {
      return { status: "error", message: DUPLICATE_MESSAGE };
    }

    const updated = await updateSubjectRecord(
      instituteId,
      id.data,
      values.data.subjectName
    );
    if (!updated) return { status: "error", message: "Subject not found." };

    revalidatePath(PATH);
    return { status: "success", message: "Subject updated." };
  } catch {
    return databaseError();
  }
}

export async function deleteSubject(
  idInput: unknown
): Promise<SubjectActionResult> {
  const id = subjectIdSchema.safeParse(idInput);
  if (!id.success) return { status: "error", message: "Invalid Subject." };

  const instituteId = await requireInstituteId();
  try {
    const existing = await getSubject(instituteId, id.data);
    if (!existing) return { status: "error", message: "Subject not found." };

    const deleted = await deleteSubjectRecord(instituteId, id.data);
    if (!deleted) return { status: "error", message: "Subject not found." };

    revalidatePath(PATH);
    return { status: "success", message: "Subject deleted." };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23503"
    ) {
      return {
        status: "error",
        message:
          "This Subject is already in use and cannot be deleted. Remove its linked classes, batches, schedules, practice work, or other academic records first.",
      };
    }
    return {
      status: "error",
      message: "We could not delete the Subject. Please try again.",
    };
  }
}

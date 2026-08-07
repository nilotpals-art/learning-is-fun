"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { DASHBOARD_ROLES } from "@/lib/navigation";
import { requireRole } from "@/lib/auth/services/auth-service";
import {
  getAcademicYear,
  insertAcademicYear,
  switchCurrentAcademicYear,
  updateAcademicYearActiveState,
  updateAcademicYearRecord,
} from "@/features/academic-years/services/academic-year-service";
import type { AcademicYearActionResult } from "@/features/academic-years/types/academic-year";
import {
  academicYearIdSchema,
  academicYearSchema,
} from "@/features/academic-years/validations/academic-year-schema";

const PATH = "/masters/academic-years";
const DUPLICATE_CODE = "23505";

interface DatabaseError {
  code?: string;
}

async function requireInstituteId(): Promise<string> {
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) redirect("/unauthorized");
  return profile.instituteId;
}

function actionError(error: unknown): AcademicYearActionResult {
  if ((error as DatabaseError)?.code === DUPLICATE_CODE) {
    return {
      status: "error",
      message: "An Academic Year with this name already exists.",
    };
  }
  return {
    status: "error",
    message: "We could not save the Academic Year. Please try again.",
  };
}

export async function createAcademicYear(
  input: unknown
): Promise<AcademicYearActionResult> {
  const parsed = academicYearSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const instituteId = await requireInstituteId();
  try {
    await insertAcademicYear(instituteId, parsed.data);
    revalidatePath(PATH);
    return { status: "success", message: "Academic Year created." };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateAcademicYear(
  idInput: unknown,
  input: unknown
): Promise<AcademicYearActionResult> {
  const id = academicYearIdSchema.safeParse(idInput);
  const values = academicYearSchema.safeParse(input);
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
    const existing = await getAcademicYear(instituteId, id.data);
    if (!existing) return { status: "error", message: "Academic Year not found." };
    if (existing.isCurrent && !values.data.isActive) {
      return {
        status: "error",
        message: "The Current Academic Year cannot be deactivated.",
      };
    }
    const updated = await updateAcademicYearRecord(
      instituteId,
      id.data,
      values.data
    );
    if (!updated) return { status: "error", message: "Academic Year not found." };
    revalidatePath(PATH);
    return { status: "success", message: "Academic Year updated." };
  } catch (error) {
    return actionError(error);
  }
}

export async function toggleAcademicYearActive(
  idInput: unknown
): Promise<AcademicYearActionResult> {
  const id = academicYearIdSchema.safeParse(idInput);
  if (!id.success) return { status: "error", message: "Academic Year not found." };
  const instituteId = await requireInstituteId();
  try {
    const existing = await getAcademicYear(instituteId, id.data);
    if (!existing) return { status: "error", message: "Academic Year not found." };
    if (existing.isCurrent && existing.isActive) {
      return {
        status: "error",
        message: "The Current Academic Year cannot be deactivated. Set another Active year as Current first.",
      };
    }
    const updated = await updateAcademicYearActiveState(
      instituteId,
      id.data,
      !existing.isActive
    );
    if (!updated) return { status: "error", message: "Academic Year not found." };
    revalidatePath(PATH);
    return {
      status: "success",
      message: existing.isActive
        ? "Academic Year deactivated."
        : "Academic Year activated.",
    };
  } catch {
    return { status: "error", message: "We could not change the status. Please try again." };
  }
}

export async function setCurrentAcademicYear(
  idInput: unknown
): Promise<AcademicYearActionResult> {
  const id = academicYearIdSchema.safeParse(idInput);
  if (!id.success) return { status: "error", message: "Academic Year not found." };
  const instituteId = await requireInstituteId();
  try {
    const existing = await getAcademicYear(instituteId, id.data);
    if (!existing) return { status: "error", message: "Academic Year not found." };
    if (!existing.isActive) {
      return { status: "error", message: "Activate this Academic Year before setting it as Current." };
    }
    if (existing.isCurrent) {
      return { status: "success", message: "This is already the Current Academic Year." };
    }
    const updated = await switchCurrentAcademicYear(instituteId, id.data);
    if (!updated) return { status: "error", message: "Academic Year not found or inactive." };
    revalidatePath(PATH);
    return { status: "success", message: "Current Academic Year changed." };
  } catch {
    return { status: "error", message: "We could not change the Current Academic Year. Please try again." };
  }
}

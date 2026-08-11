"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  provisionParentIdentity,
  provisionStudentIdentity,
} from "@/features/auth/services/user-provisioning-service";
import { resolveParentByEmail } from "@/features/students/services/parent-resolution-service";
import {
  compensateAdmissionFoundation,
  createAdmissionFoundation,
  getIdentityProfileId,
  getStudent,
  listActiveAcademicYears,
  studentEmailExists,
  updateStudentRecord,
} from "@/features/students/services/student-service";
import type { StudentActionResult } from "@/features/students/types/student";
import {
  studentCreateSchema,
  studentEditSchema,
  studentIdSchema,
} from "@/features/students/validations/student-schema";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";
import { deleteManagedAuthUser } from "@/lib/supabase/admin";
import { applyFeeStructure, findFeeStructure } from "@/features/fees/services/fee-structure-service";

const PATH = "/students";

async function requireInstituteId(): Promise<string> {
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) redirect("/unauthorized");
  return profile.instituteId;
}

async function requireAdminProfile() {
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) redirect("/unauthorized");
  return profile;
}

function saveError(message = "We could not save the Student. Please try again."): StudentActionResult {
  return { status: "error", message };
}

async function compensateCreatedAdmission(
  instituteId: string,
  foundation: Awaited<ReturnType<typeof createAdmissionFoundation>>,
  removeStudentAuth: boolean
): Promise<StudentActionResult> {
  try {
    if (removeStudentAuth) {
      const profileId = await getIdentityProfileId(
        instituteId,
        "students",
        foundation.student_id
      );
      if (profileId) await deleteManagedAuthUser(profileId);
    }
    await compensateAdmissionFoundation(foundation);
    return {
      status: "error",
      code: "provisioning_failed",
      message: "Student admission could not be completed. No partial admission was retained.",
    };
  } catch (error) {
    console.error("Student admission compensation failed", {
      studentId: foundation.student_id,
      parentId: foundation.parent_id,
      errorCode: error instanceof Error ? error.name : "unknown",
    });
    return {
      status: "error",
      code: "manual_reconciliation_required",
      message: "Student admission requires manual reconciliation. Contact the system administrator.",
    };
  }
}

export async function createStudent(input: unknown): Promise<StudentActionResult> {
  const parsed = studentCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const profile = await requireAdminProfile();
  const instituteId = profile.instituteId!;
  const values = parsed.data;

  try {
    const years = await listActiveAcademicYears(instituteId);
    if (!years.some((year) => year.id === values.academicYearId)) {
      return saveError("The selected Academic Year is inactive or unavailable.");
    }
    if (await studentEmailExists(values.email)) {
      return saveError("A Student account already uses this email address.");
    }
    const feeStructure = await findFeeStructure(profile, values.academicYearId, values.classId);

    const parent = await resolveParentByEmail(
      instituteId,
      values.parentEmail,
      values.parentName,
      values.parentMobile
    );
    let parentId: string | null = null;
    if (parent) {
      if (!parent.matches && values.useExistingParentId !== parent.id) {
        return {
          status: "parent_conflict",
          message: "A Parent account with this email already exists with different details.",
          conflict: {
            parentId: parent.id,
            existingName: parent.name,
            existingMobile: parent.mobile,
            submittedName: values.parentName,
            submittedMobile: values.parentMobile,
            linkedChildCount: parent.linkedChildCount,
          },
        };
      }
      parentId = parent.id;
    }

    const foundation = await createAdmissionFoundation(values, parentId);
    const studentIdentity = await provisionStudentIdentity({
      studentId: foundation.student_id,
      email: values.email,
    });
    if (studentIdentity.status !== "created" && studentIdentity.status !== "reused") {
      if (
        studentIdentity.status === "error" &&
        studentIdentity.code === "manual_reconciliation_required"
      ) {
        return {
          status: "error",
          code: "manual_reconciliation_required",
          message: studentIdentity.message,
        };
      }
      return compensateCreatedAdmission(instituteId, foundation, false);
    }

    const parentIdentity = await provisionParentIdentity({
      parentId: foundation.parent_id,
      email: values.parentEmail,
      studentId: foundation.student_id,
      relationship: values.relationship,
    });
    if (parentIdentity.status !== "created" && parentIdentity.status !== "reused") {
      if (
        parentIdentity.status === "error" &&
        parentIdentity.code === "manual_reconciliation_required"
      ) {
        return {
          status: "error",
          code: "manual_reconciliation_required",
          message: parentIdentity.message,
        };
      }
      return compensateCreatedAdmission(
        instituteId,
        foundation,
        studentIdentity.status === "created"
      );
    }

    let feesWarning: string | undefined;
    if (feeStructure) {
      try {
        const overrides = values.feeStructureId === feeStructure.id ? values.feeOverrides : feeStructure.items.map((item) => ({ itemId: item.id, include: true, amount: item.amount, discountType: item.defaultDiscountType, discountValue: item.defaultDiscountValue }));
        await applyFeeStructure(profile, foundation.student_id, feeStructure.id, overrides);
      } catch (error) {
        const message = error && typeof error === "object" && "message" in error
          ? String(error.message)
          : "";
        feesWarning = message.includes("FEES_NO_APPLICABLE_MONTHS")
          ? "Student admission succeeded, but no monthly due date remains within the selected Academic Year. Review Fees from Student Fees."
          : "Student admission succeeded, but Fee assignment failed. Complete it from Student Fees.";
      }
    } else {
      feesWarning = "No fee structure configured for this class. Fees were not assigned.";
    }

    revalidatePath(PATH);
    revalidatePath("/fees/student-fees");
    return {
      status: "success",
      message: `Student admitted as ${foundation.admission_no}.`,
      admissionNumber: foundation.admission_no,
      feesWarning,
    };
  } catch (error) {
    const databaseError = error as { code?: string; message?: string };
    if (databaseError.code === "23505") {
      return saveError("A Student or Parent account with these details already exists.");
    }
    if (databaseError.message?.includes("ACADEMIC_YEAR")) {
      return saveError("The selected Academic Year is inactive or unavailable.");
    }
    return saveError();
  }
}

export async function updateStudent(
  idInput: unknown,
  input: unknown
): Promise<StudentActionResult> {
  const id = studentIdSchema.safeParse(idInput);
  const values = studentEditSchema.safeParse(input);
  if (!id.success || !values.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: values.success ? undefined : values.error.flatten().fieldErrors,
    };
  }

  const instituteId = await requireInstituteId();
  try {
    if (!(await getStudent(instituteId, id.data))) {
      return saveError("Student not found.");
    }
    if (!(await updateStudentRecord(instituteId, id.data, values.data))) {
      return saveError("Student not found.");
    }
    revalidatePath(PATH);
    return { status: "success", message: "Student updated." };
  } catch {
    return saveError();
  }
}

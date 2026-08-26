"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { applyFeeStructure, findFeeStructure } from "@/features/fees/services/fee-structure-service";
import { changeStudentAssignment, createOrReuseSchool } from "@/features/student-academic-assignments/services/student-academic-assignment-service";
import type { AssignmentActionResult } from "@/features/student-academic-assignments/types/student-academic-assignment";
import { studentAssignmentSchema } from "@/features/student-academic-assignments/validations/student-academic-assignment-schema";
import { createSchoolSchema } from "@/features/student-academic-assignments/validations/school-schema";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

const errors: Record<string, string> = {
  STUDENT_ASSIGNMENT_STUDENT_INVALID: "Student not found.",
  STUDENT_ASSIGNMENT_ACADEMIC_YEAR_INVALID: "The selected Academic Year is inactive or unavailable.",
  STUDENT_ASSIGNMENT_SCHOOL_INVALID: "The selected School is inactive or unavailable.",
  STUDENT_ASSIGNMENT_BOARD_INVALID: "The selected Board is unavailable.",
  STUDENT_ASSIGNMENT_CLASS_INVALID: "The selected Class is unavailable.",
  STUDENT_ASSIGNMENT_BATCH_INCOMPATIBLE: "The selected Batch does not match the selected Board and Class.",
  STUDENT_ASSIGNMENT_EFFECTIVE_FROM_NOT_LATER: "Effective From must be later than the current assignment's start date.",
  STUDENT_ASSIGNMENT_OVERLAP: "This assignment overlaps existing Student academic history.",
  STUDENT_ASSIGNMENT_CURRENT_CONFLICT: "The Student already has a Current assignment.",
};

export async function saveStudentAssignment(input: unknown): Promise<AssignmentActionResult> {
  const parsed = studentAssignmentSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Please correct the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) redirect("/unauthorized");
  try {
    const result = await changeStudentAssignment(parsed.data);

    // A student who had previously left can rejoin without losing any historical records.
    // Creating a new Current assignment reactivates only the Student Master status.
    const supabase = await createClient();
    const { error: reactivateError } = await supabase
      .from("students")
      .update({ status: "Active", updated_at: new Date().toISOString() })
      .eq("institute_id", profile.instituteId)
      .eq("id", parsed.data.studentId)
      .eq("status", "Left");
    if (reactivateError) throw reactivateError;

    // Academic assignment/promotion is the existing-student equivalent of admission.
    // Apply the active fee structure for the selected Academic Year + Class so annual fee changes
    // flow to promoted/existing students without re-entering fees manually.
    try {
      const structure = await findFeeStructure(profile, parsed.data.academicYearId, parsed.data.classId);
      if (structure) {
        await applyFeeStructure(profile, parsed.data.studentId, structure.id, structure.items.map((item) => ({
          itemId: item.id,
          include: true,
          amount: item.amount,
          discountType: null,
          discountValue: 0,
        })));
      }
    } catch (feeError) {
      console.error("Academic assignment saved but automatic fee assignment was skipped", {
        studentId: parsed.data.studentId,
        academicYearId: parsed.data.academicYearId,
        classId: parsed.data.classId,
        error: feeError instanceof Error ? feeError.message : "unknown",
      });
    }

    revalidatePath("/students/academic-assignments");
    revalidatePath("/students");
    revalidatePath("/fees/student-fees");
    revalidatePath("/fees/reports");
    return { status: "success", assignmentId: result.assignmentId, message: result.operation === "created" ? "Student assigned successfully. Left students are automatically reactivated when they rejoin." : "Academic assignment changed and previous history preserved." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const code = Object.keys(errors).find((key) => message.includes(key));
    return { status: "error", message: code ? errors[code] : "We could not save the academic assignment. Please try again." };
  }
}

export type CreateSchoolActionResult =
  | { status: "success"; school: { id: string; name: string }; reused: boolean }
  | { status: "error"; message: string };

export async function createSchool(input: unknown): Promise<CreateSchoolActionResult> {
  const parsed = createSchoolSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Enter a valid School Name." };
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) redirect("/unauthorized");
  try {
    const school = await createOrReuseSchool(profile.instituteId, parsed.data);
    revalidatePath("/students/academic-assignments");
    revalidatePath("/students");
    return { status: "success", school: { id: school.id, name: school.name }, reused: school.reused };
  } catch {
    return { status: "error", message: "We could not create the School. Please try again." };
  }
}

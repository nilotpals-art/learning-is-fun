"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { changeStudentAssignment, createOrReuseSchool } from "@/features/student-academic-assignments/services/student-academic-assignment-service";
import type { AssignmentActionResult } from "@/features/student-academic-assignments/types/student-academic-assignment";
import { studentAssignmentSchema } from "@/features/student-academic-assignments/validations/student-academic-assignment-schema";
import { createSchoolSchema } from "@/features/student-academic-assignments/validations/school-schema";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

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
    revalidatePath("/students/academic-assignments");
    revalidatePath("/students");
    return { status: "success", assignmentId: result.assignmentId, message: result.operation === "created" ? "Student assigned successfully." : "Academic assignment changed and previous history preserved." };
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

"use server";

import { revalidatePath } from "next/cache";

import type { RolloverActionResult } from "@/features/rollover/types/rollover";
import {
  approveRolloverSchema,
  cancelBreakSchema,
  completeBreakSchema,
  confirmRolloverSchema,
  createBreakSchema,
  finalizeRolloverSchema,
  generateRolloverSchema,
  overrideRolloverSchema,
  parentResponseSchema,
  resolveRolloverSchema,
  setDeadlineSchema,
} from "@/features/rollover/validations/rollover-schema";
import { requireActionRole } from "@/lib/auth/services/auth-service";
import { createClient } from "@/lib/supabase/server";
import { DASHBOARD_ROLES } from "@/lib/navigation";

const PARENT_ROLE = ["Parent"] as const;
const WORKSPACE_PATH = "/students/rollover";

function message(code: string | undefined, fallback: string): string {
  if (!code) return fallback;
  if (code.includes("UNAUTHORIZED")) return "You are not authorized to perform this action.";
  if (code.includes("ROLLOVER_REQUEST_NOT_FOUND")) return "The Rollover Request could not be found.";
  if (code.includes("ROLLOVER_REQUEST_CLOSED")) return "This Rollover Request is already resolved.";
  if (code.includes("ROLLOVER_RESPONSE_LOCKED") || code.includes("ROLLOVER_ALREADY_CONFIRMED"))
    return "This choice is already confirmed and locked.";
  if (code.includes("ROLLOVER_RESPONSE_NOT_CONTINUING"))
    return "Confirm continuation before locking a Batch.";
  if (code.includes("ROLLOVER_BATCH_REQUIRED")) return "Select a Batch before confirming.";
  if (code.includes("ROLLOVER_BATCH_FULL")) return "This Batch is now full. Choose another Batch.";
  if (code.includes("ROLLOVER_BATCH_INVALID_OR_FULL") || code.includes("ROLLOVER_BATCH_INCOMPATIBLE"))
    return "The selected Batch is incompatible or full.";
  if (code.includes("ROLLOVER_BATCH_UNCHANGED")) return "The selected Batch is unchanged.";
  if (code.includes("ROLLOVER_OVERRIDE_REASON_REQUIRED"))
    return "A reason of at least 5 characters is required.";
  if (code.includes("ROLLOVER_FINALIZE_REQUIRES_CONFIRMATION"))
    return "The parent has not confirmed continuation. Approve the request first.";
  if (code.includes("ROLLOVER_RESPONSE_INVALID")) return "The continuation selection is invalid.";
  if (code.includes("ROLLOVER_JOINING_TYPE_REQUIRED")) return "Select a joining type.";
  if (code.includes("ROLLOVER_JOINING_DATE_REQUIRED")) return "Expected joining date is required.";
  if (code.includes("ROLLOVER_JOINING_DATE_INVALID")) return "Expected joining date is invalid.";
  if (code.includes("ROLLOVER_RESOLUTION_INVALID")) return "The selected resolution is invalid.";
  if (code.includes("ROLLOVER_RESOLUTION_NOTES_REQUIRED"))
    return "Notes of at least 5 characters are required.";
  if (code.includes("ROLLOVER_BREAK_DATE_INVALID")) return "The Break dates are invalid.";
  if (code.includes("ROLLOVER_BREAK_REASON_REQUIRED")) return "A reason is required.";
  if (code.includes("ROLLOVER_BREAK_FEE_TREATMENT_INVALID")) return "The Fee Treatment is invalid.";
  if (code.includes("ROLLOVER_BREAK_ASSIGNMENT_INVALID")) return "No matching current assignment was found.";
  if (code.includes("ROLLOVER_BREAK_OUTSIDE_ASSIGNMENT"))
    return "The Break dates fall outside the assignment period.";
  if (code.includes("ROLLOVER_BREAK_NOT_FOUND")) return "The Break record could not be found.";
  if (code.includes("ROLLOVER_BREAK_CLOSED")) return "This Break is already resolved.";
  if (code.includes("ROLLOVER_YEARS_REQUIRED")) return "Select both Academic Years.";
  if (code.includes("ROLLOVER_YEARS_MUST_DIFFER")) return "Source and Target years must differ.";
  if (code.includes("ROLLOVER_SOURCE_YEAR_INVALID") || code.includes("ROLLOVER_TARGET_YEAR_INVALID"))
    return "One of the selected Academic Years is inactive or unavailable.";
  return fallback;
}

function actionError(error: unknown, fallback: string): RolloverActionResult {
  const code = error && typeof error === "object" && "message" in error ? String((error as { message: unknown }).message) : undefined;
  return { status: "error", message: message(code, fallback) };
}

export async function generateRolloverWorkspace(input: unknown): Promise<RolloverActionResult> {
  const parsed = generateRolloverSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Please select both Academic Years.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  await requireActionRole(DASHBOARD_ROLES);
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("generate_rollover_workspace", {
      p_source_year_id: parsed.data.sourceYearId,
      p_target_year_id: parsed.data.targetYearId,
    });
    if (error) throw error;
    revalidatePath(WORKSPACE_PATH);
    return { status: "success", message: "Rollover workspace generated for the selected years." };
  } catch (error) {
    return actionError(error, "We could not generate the Rollover workspace.");
  }
}

export async function saveParentRolloverResponse(input: unknown): Promise<RolloverActionResult> {
  const parsed = parentResponseSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Please correct the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  await requireActionRole(PARENT_ROLE);
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("save_parent_rollover_response", {
      p_request_id: parsed.data.requestId,
      p_parent_response: parsed.data.parentResponse,
      p_joining_type: parsed.data.joiningType ?? null,
      p_expected_joining_date: parsed.data.expectedJoiningDate ?? null,
      p_selected_batch_id: parsed.data.selectedBatchId ?? null,
      p_notes: parsed.data.notes ?? null,
    });
    if (error) throw error;
    revalidatePath("/parent/continuation");
    return { status: "success", message: "Continuation selection saved." };
  } catch (error) {
    return actionError(error, "We could not save your selection.");
  }
}

export async function confirmParentRollover(input: unknown): Promise<RolloverActionResult> {
  const parsed = confirmRolloverSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Invalid Rollover Request." };
  }
  await requireActionRole(PARENT_ROLE);
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("confirm_parent_rollover", {
      p_request_id: parsed.data.requestId,
    });
    if (error) throw error;
    revalidatePath("/parent/continuation");
    return { status: "success", message: "Your choice is confirmed and locked." };
  } catch (error) {
    return actionError(error, "We could not confirm your choice.");
  }
}

export async function adminOverrideRolloverBatch(input: unknown): Promise<RolloverActionResult> {
  const parsed = overrideRolloverSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Please correct the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  await requireActionRole(DASHBOARD_ROLES);
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("admin_override_rollover_batch", {
      p_request_id: parsed.data.requestId,
      p_new_batch_id: parsed.data.newBatchId,
      p_reason: parsed.data.reason,
    });
    if (error) throw error;
    revalidatePath(WORKSPACE_PATH);
    revalidatePath(`${WORKSPACE_PATH}/${parsed.data.requestId}`);
    return { status: "success", message: "Batch override applied." };
  } catch (error) {
    return actionError(error, "We could not override the Batch.");
  }
}

export async function finalizeRollover(input: unknown): Promise<RolloverActionResult> {
  const parsed = finalizeRolloverSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Invalid Rollover Request." };
  }
  await requireActionRole(DASHBOARD_ROLES);
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("finalize_rollover", {
      p_request_id: parsed.data.requestId,
      p_remarks: parsed.data.remarks ?? null,
    });
    if (error) throw error;
    revalidatePath(WORKSPACE_PATH);
    revalidatePath(`${WORKSPACE_PATH}/${parsed.data.requestId}`);
    return { status: "success", message: "Rollover finalized. The next-year assignment was created." };
  } catch (error) {
    return actionError(error, "We could not finalize the Rollover.");
  }
}

export async function resolveRolloverRequest(input: unknown): Promise<RolloverActionResult> {
  const parsed = resolveRolloverSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Please correct the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  await requireActionRole(DASHBOARD_ROLES);
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("resolve_rollover_request", {
      p_request_id: parsed.data.requestId,
      p_admin_status: parsed.data.adminStatus,
      p_notes: parsed.data.notes,
    });
    if (error) throw error;
    revalidatePath(WORKSPACE_PATH);
    revalidatePath(`${WORKSPACE_PATH}/${parsed.data.requestId}`);
    return { status: "success", message: parsed.data.adminStatus === "rejected" ? "Request marked as not continuing." : "Request cancelled." };
  } catch (error) {
    return actionError(error, "We could not resolve the Rollover Request.");
  }
}

export async function approveRolloverRequest(input: unknown): Promise<RolloverActionResult> {
  const parsed = approveRolloverSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Please correct the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  await requireActionRole(DASHBOARD_ROLES);
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("approve_rollover_request", {
      p_request_id: parsed.data.requestId,
      p_notes: parsed.data.notes,
    });
    if (error) throw error;
    revalidatePath(WORKSPACE_PATH);
    revalidatePath(`${WORKSPACE_PATH}/${parsed.data.requestId}`);
    return { status: "success", message: "Request approved and ready for finalization." };
  } catch (error) {
    return actionError(error, "We could not approve the Rollover Request.");
  }
}

export async function setRolloverResponseDeadline(input: unknown): Promise<RolloverActionResult> {
  const parsed = setDeadlineSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Select a valid date." };
  }
  await requireActionRole(DASHBOARD_ROLES);
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("set_rollover_response_deadline", {
      p_academic_year_id: parsed.data.academicYearId,
      p_deadline: parsed.data.deadline ?? null,
    });
    if (error) throw error;
    revalidatePath(WORKSPACE_PATH);
    return { status: "success", message: "Response deadline updated." };
  } catch (error) {
    return actionError(error, "We could not update the response deadline.");
  }
}

export async function createEnrollmentBreak(input: unknown): Promise<RolloverActionResult> {
  const parsed = createBreakSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Please correct the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  await requireActionRole(DASHBOARD_ROLES);
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("create_enrollment_break", {
      p_student_id: parsed.data.studentId,
      p_academic_year_id: parsed.data.academicYearId,
      p_batch_id: parsed.data.batchId,
      p_break_from: parsed.data.breakFrom,
      p_break_to: parsed.data.breakTo,
      p_reason: parsed.data.reason,
      p_fee_treatment: parsed.data.feeTreatment,
      p_fee_treatment_notes: parsed.data.feeTreatmentNotes ?? null,
    });
    if (error) throw error;
    revalidatePath(WORKSPACE_PATH);
    return { status: "success", message: "Enrollment Break created." };
  } catch (error) {
    return actionError(error, "We could not create the Enrollment Break.");
  }
}

export async function completeEnrollmentBreak(input: unknown): Promise<RolloverActionResult> {
  const parsed = completeBreakSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Invalid Break record." };
  }
  await requireActionRole(DASHBOARD_ROLES);
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("complete_enrollment_break", {
      p_break_id: parsed.data.breakId,
      p_actual_resumption_date: parsed.data.actualResumptionDate ?? null,
    });
    if (error) throw error;
    revalidatePath(WORKSPACE_PATH);
    return { status: "success", message: "Enrollment Break completed." };
  } catch (error) {
    return actionError(error, "We could not complete the Enrollment Break.");
  }
}

export async function cancelEnrollmentBreak(input: unknown): Promise<RolloverActionResult> {
  const parsed = cancelBreakSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Please correct the highlighted fields." };
  }
  await requireActionRole(DASHBOARD_ROLES);
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("cancel_enrollment_break", {
      p_break_id: parsed.data.breakId,
      p_reason: parsed.data.reason,
    });
    if (error) throw error;
    revalidatePath(WORKSPACE_PATH);
    return { status: "success", message: "Enrollment Break cancelled." };
  } catch (error) {
    return actionError(error, "We could not cancel the Enrollment Break.");
  }
}
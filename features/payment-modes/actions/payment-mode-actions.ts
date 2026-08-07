"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  getInstitutePaymentModeSetupState,
  getPaymentMode,
  insertPaymentMode,
  insertRecommendedPaymentModes,
  paymentModeNameExists,
  updatePaymentModeRecord,
} from "@/features/payment-modes/services/payment-mode-service";
import type { PaymentModeActionResult } from "@/features/payment-modes/types/payment-mode";
import { paymentModeIdSchema, paymentModeSchema } from "@/features/payment-modes/validations/payment-mode-schema";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

const PATH = "/masters/payment-modes";
const DUPLICATE_MESSAGE = "A Payment Mode with this name already exists.";

interface DatabaseError { code?: string }

async function requireInstituteId(): Promise<string> {
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) redirect("/unauthorized");
  return profile.instituteId;
}

function databaseError(error: unknown): PaymentModeActionResult {
  if ((error as DatabaseError).code === "23505") {
    return { status: "error", message: DUPLICATE_MESSAGE };
  }
  return { status: "error", message: "We could not save the Payment Mode. Please try again." };
}

export async function createInitialPaymentModes(): Promise<PaymentModeActionResult> {
  const instituteId = await requireInstituteId();
  try {
    const state = await getInstitutePaymentModeSetupState(instituteId);
    if (state.complete) return { status: "success", message: "Initial Payment Modes are already set up." };
    const created = await insertRecommendedPaymentModes(instituteId, state);
    revalidatePath(PATH);
    return { status: "success", message: `Created ${created} initial Payment Mode${created === 1 ? "" : "s"}.` };
  } catch (error) {
    if ((error as DatabaseError).code === "23505") {
      const latest = await getInstitutePaymentModeSetupState(instituteId);
      if (latest.complete) {
        revalidatePath(PATH);
        return { status: "success", message: "Initial Payment Modes are already set up." };
      }
    }
    return { status: "error", message: "We could not create the initial Payment Modes. Please try again." };
  }
}

export async function createPaymentMode(input: unknown): Promise<PaymentModeActionResult> {
  const parsed = paymentModeSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Please correct the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  const instituteId = await requireInstituteId();
  try {
    if (await paymentModeNameExists(instituteId, parsed.data.name)) return { status: "error", message: DUPLICATE_MESSAGE, fieldErrors: { name: [DUPLICATE_MESSAGE] } };
    await insertPaymentMode(instituteId, parsed.data);
    revalidatePath(PATH);
    return { status: "success", message: "Payment Mode created." };
  } catch (error) { return databaseError(error); }
}

export async function updatePaymentMode(idInput: unknown, input: unknown): Promise<PaymentModeActionResult> {
  const id = paymentModeIdSchema.safeParse(idInput);
  const values = paymentModeSchema.safeParse(input);
  if (!id.success || !values.success) return { status: "error", message: "Please correct the highlighted fields.", fieldErrors: values.success ? undefined : values.error.flatten().fieldErrors };
  const instituteId = await requireInstituteId();
  try {
    if (!(await getPaymentMode(instituteId, id.data))) return { status: "error", message: "Payment Mode not found." };
    if (await paymentModeNameExists(instituteId, values.data.name, id.data)) return { status: "error", message: DUPLICATE_MESSAGE, fieldErrors: { name: [DUPLICATE_MESSAGE] } };
    if (!(await updatePaymentModeRecord(instituteId, id.data, values.data))) return { status: "error", message: "Payment Mode not found." };
    revalidatePath(PATH);
    return { status: "success", message: "Payment Mode updated." };
  } catch (error) { return databaseError(error); }
}

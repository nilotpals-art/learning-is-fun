"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FeeActionResult } from "@/features/fees/types/fees";
import { feeAssignmentSchema, feePaymentSchema, reminderSchema, reversalSchema, settingsSchema } from "@/features/fees/validations/fee-schema";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

async function admin() { const profile = await requireRole(DASHBOARD_ROLES); if (!profile.instituteId) redirect("/unauthorized"); return profile; }
function errorResult(error: unknown): FeeActionResult {
  const message = error && typeof error === "object" && "message" in error ? String(error.message) : "";
  const known: Record<string, string> = {
    FEES_UNAUTHORIZED: "You are not authorised to manage Fees.", FEES_REFERENCE_INVALID: "The selected Student, Academic Year, or Fee Head is invalid.",
    FEES_INSTALLMENT_TOTAL_INVALID: "Installment totals must match the assigned fee and discount.", FEES_INSTALLMENT_DUPLICATE: "Installment numbers must be unique.",
    FEES_PAYMENT_MODE_INVALID: "Select an active Payment Mode.", FEES_ALLOCATION_EXCEEDS_OUTSTANDING: "A payment allocation exceeds the outstanding amount.",
    FEES_PAYMENT_ALREADY_REVERSED: "This payment has already been reversed.", FEES_DUE_NOT_OUTSTANDING: "This fee has no outstanding balance.",
    FEES_NO_WHATSAPP_RECIPIENT: "No eligible Student or Parent mobile number is available.",
  };
  const code = Object.keys(known).find((key) => message.includes(key));
  return { status: "error", message: code ? known[code] : "The Fees operation could not be completed. Please try again." };
}
function refresh() { ["/fees", "/fees/student-fees", "/fees/collect", "/fees/payments", "/fees/reports", "/fees/messages", "/student/fees", "/dashboard"].forEach((path) => revalidatePath(path)); }
function fields(value: Record<string, string[] | undefined>): Record<string, string[]> { return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string[]] => Boolean(entry[1]))); }

export async function createFeeAssignment(input: unknown): Promise<FeeActionResult> {
  const parsed = feeAssignmentSchema.safeParse(input); if (!parsed.success) return { status: "error", message: "Please correct the Fee Assignment details.", fieldErrors: fields(parsed.error.flatten().fieldErrors) };
  await admin(); const supabase = await createClient(); const v = parsed.data;
  const { data, error } = await supabase.rpc("create_student_fee_assignment", { p_student_id: v.studentId, p_academic_year_id: v.academicYearId, p_fee_head_id: v.feeHeadId, p_amount: v.amount, p_discount_type: v.discountType, p_discount_value: v.discountValue, p_effective_from: v.effectiveFrom, p_effective_to: v.effectiveTo, p_installments: v.installments.map((x) => ({ installment_no: x.installmentNo, due_date: x.dueDate, gross_amount: x.grossAmount, discount_amount: x.discountAmount, net_amount: x.netAmount })) });
  if (error) return errorResult(error); refresh(); return { status: "success", message: "Student fee assigned.", data };
}

export async function postFeePayment(input: unknown): Promise<FeeActionResult<{ paymentId: string; receiptNo: string }>> {
  const parsed = feePaymentSchema.safeParse(input); if (!parsed.success) return { status: "error", message: "Please correct the payment details.", fieldErrors: fields(parsed.error.flatten().fieldErrors) };
  await admin(); const supabase = await createClient(); const v = parsed.data;
  const { data, error } = await supabase.rpc("post_fee_payment", { p_student_id: v.studentId, p_academic_year_id: v.academicYearId, p_payment_mode_id: v.paymentModeId, p_payment_date: v.paymentDate, p_reference_no: v.referenceNo, p_remarks: v.remarks, p_allocations: v.allocations.map((x) => ({ due_id: x.dueId, amount: x.amount })) });
  if (error) return errorResult(error); refresh(); const result = data as { paymentId: string; receiptNo: string }; return { status: "success", message: `Payment posted. Receipt ${result.receiptNo}.`, data: result };
}

export async function reverseFeePayment(input: unknown): Promise<FeeActionResult> {
  const parsed = reversalSchema.safeParse(input); if (!parsed.success) return { status: "error", message: "Provide a valid reversal reason." };
  await admin(); const supabase = await createClient(); const { error } = await supabase.rpc("reverse_fee_payment", { p_payment_id: parsed.data.paymentId, p_reason: parsed.data.reason });
  if (error) return errorResult(error); refresh(); return { status: "success", message: "Payment reversed. The original receipt remains in the audit history." };
}

export async function queueManualFeeReminder(input: unknown): Promise<FeeActionResult> {
  const parsed = reminderSchema.safeParse(input); if (!parsed.success) return { status: "error", message: "Fee due not found." };
  await admin(); const supabase = await createClient(); const { error } = await supabase.rpc("queue_manual_fee_reminder", { p_due_id: parsed.data.dueId });
  if (error) return errorResult(error); revalidatePath("/fees/messages"); revalidatePath("/fees/student-fees"); return { status: "success", message: "WhatsApp reminder queued for delivery." };
}

export async function queueOverdueFeeReminders(): Promise<FeeActionResult> {
  await admin(); const supabase = await createClient(); const { data, error } = await supabase.rpc("queue_overdue_fee_whatsapp_reminders", {});
  if (error) return errorResult(error); revalidatePath("/fees/messages"); const count = Number((data as { queuedCount?: number }).queuedCount ?? 0); return { status: "success", message: `${count} overdue reminder${count === 1 ? "" : "s"} queued. This action is scheduler-ready; no automatic schedule is configured.` };
}

export async function updateFeeSettings(input: unknown): Promise<FeeActionResult> {
  const parsed = settingsSchema.safeParse(input); if (!parsed.success) return { status: "error", message: "Please correct the reminder settings.", fieldErrors: fields(parsed.error.flatten().fieldErrors) };
  const profile = await admin(); const supabase = await createClient(); const v = parsed.data;
  const { error } = await supabase.from("fee_settings").update({ whatsapp_fee_reminders_enabled: v.whatsappFeeRemindersEnabled, reminder_after_due_days: v.reminderAfterDueDays, repeat_every_days: v.repeatEveryDays, max_reminders_per_due: v.maxRemindersPerDue, whatsapp_payment_confirmations_enabled: v.whatsappPaymentConfirmationsEnabled, recipient_preference: v.recipientPreference, reminder_template_name: v.reminderTemplateName, confirmation_template_name: v.confirmationTemplateName, updated_by: profile.id, updated_at: new Date().toISOString() }).eq("institute_id", profile.instituteId);
  if (error) return errorResult(error); revalidatePath("/fees/settings"); return { status: "success", message: "Fee reminder settings updated." };
}

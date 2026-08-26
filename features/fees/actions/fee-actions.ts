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
    FEES_UNAUTHORIZED: "You are not authorised to manage Fees.", FEES_REFERENCE_INVALID: "The selected Student, Academic Year, or Fee Head is invalid.", FEES_PAYMENT_MODE_INVALID: "Select an active Payment Mode.", FEES_ALLOCATION_EXCEEDS_OUTSTANDING: "A payment allocation exceeds the pending amount.", FEES_PAYMENT_ALREADY_REVERSED: "This payment has already been reversed.", FEES_DUE_NOT_OUTSTANDING: "This fee has no pending balance.", FEES_NO_WHATSAPP_RECIPIENT: "No eligible Student or Parent mobile number is available.", SECURITY_DEPOSIT_AMOUNT_INVALID: "Enter a valid Security Deposit amount.", SECURITY_DEPOSIT_DUE_INVALID: "Select a valid pending fee for this student.", SECURITY_DEPOSIT_TARGET_INVALID: "Security Deposit cannot be adjusted against another Security Deposit.", SECURITY_DEPOSIT_INSUFFICIENT: "The Security Deposit balance is not sufficient.", SECURITY_DEPOSIT_EXCEEDS_DUE: "The adjustment cannot exceed the selected pending fee.", SECURITY_DEPOSIT_STUDENT_INVALID: "Student not found."
  };
  const code = Object.keys(known).find((key) => message.includes(key));
  return { status: "error", message: code ? known[code] : "The Fees operation could not be completed. Please try again." };
}
function refresh() { ["/fees", "/fees/student-fees", "/fees/collect", "/fees/payments", "/fees/reports", "/fees/messages", "/fees/settings", "/student/fees", "/parent/fees", "/dashboard"].forEach((path) => revalidatePath(path)); }
function fields(value: Record<string, string[] | undefined>): Record<string, string[]> { return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string[]] => Boolean(entry[1]))); }
function one<T>(value: T | T[] | null | undefined): T | null { return !value ? null : Array.isArray(value) ? value[0] ?? null : value; }
function escapeHtml(value: string): string { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function appOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL;
  if (configured) return configured.replace(/\/$/, "");
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  return production ? `https://${production}`.replace(/\/$/, "") : "https://learning-is-fun-ha98.vercel.app";
}

async function sendReceiptEmail(args: { instituteId: string; instituteName: string | null; studentId: string; paymentId: string; receiptNo: string; paymentDate: string; amount: number; paymentModeId: string; referenceNo: string | null; allocations: Array<{ dueId: string; amount: number }> }): Promise<"sent" | "no_email" | "not_configured" | "failed"> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL ?? process.env.BREVO_FROM_EMAIL ?? process.env.EMAIL_FROM;
  if (!apiKey || !senderEmail) return "not_configured";
  const supabase = await createClient();
  const dueIds = args.allocations.map((item) => item.dueId);
  const [studentResult, parentResult, dueResult, modeResult] = await Promise.all([
    supabase.from("students").select("name,email").eq("institute_id", args.instituteId).eq("id", args.studentId).maybeSingle(),
    supabase.from("student_parent_links").select("parent:parents!student_parent_links_parent_fkey(email)").eq("institute_id", args.instituteId).eq("student_id", args.studentId),
    supabase.from("student_fee_dues").select("id,due_date,assignment:student_fee_assignments!student_fee_dues_assignment_fkey(head:fee_heads!student_fee_assignments_fee_head_id_fkey(name),structure_item:class_fee_structure_items!student_fee_assignments_class_fee_structure_item_id_fkey(schedule_type))").eq("institute_id", args.instituteId).in("id", dueIds),
    supabase.from("payment_modes").select("name").eq("institute_id", args.instituteId).eq("id", args.paymentModeId).maybeSingle(),
  ]);
  if (studentResult.error || parentResult.error || dueResult.error || modeResult.error) return "failed";
  const recipients = new Set<string>();
  if (studentResult.data?.email) recipients.add(studentResult.data.email.toLowerCase());
  for (const link of parentResult.data ?? []) { const email = one(link.parent)?.email; if (email) recipients.add(email.toLowerCase()); }
  if (recipients.size === 0) return "no_email";

  const dueMap = new Map((dueResult.data ?? []).map((due) => [due.id, due]));
  const month = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
  const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
  const date = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });
  const rows = args.allocations.map((allocation) => {
    const due = dueMap.get(allocation.dueId);
    const assignment = one(due?.assignment);
    const head = one(assignment?.head)?.name ?? "Fee";
    const scheduleType = one(assignment?.structure_item)?.schedule_type ?? null;
    const label = scheduleType === "monthly" && due?.due_date ? `${month.format(new Date(`${due.due_date}T00:00:00+05:30`))} · ${head}` : head;
    return `<tr><td style="padding:8px 10px;border-bottom:1px solid #e5e7eb">${escapeHtml(label)}</td><td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${escapeHtml(money.format(allocation.amount))}</td></tr>`;
  }).join("");
  const instituteName = args.instituteName || "Learning Is Fun";
  const receiptUrl = `${appOrigin()}/fees/receipts/${args.paymentId}`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#172033"><div style="text-align:center;border-bottom:2px solid #e5e7eb;padding:12px 0 18px"><h2 style="margin:0">${escapeHtml(instituteName)}</h2><p style="margin:6px 0 0">Fee Payment Receipt</p><p style="margin:8px 0 0;font-family:monospace">${escapeHtml(args.receiptNo)}</p></div><div style="padding:18px 0"><p><strong>Student:</strong> ${escapeHtml(studentResult.data?.name ?? "Student")}</p><p><strong>Payment Date:</strong> ${escapeHtml(date.format(new Date(args.paymentDate)))}</p><p><strong>Payment Mode:</strong> ${escapeHtml(modeResult.data?.name ?? "Payment")}</p>${args.referenceNo ? `<p><strong>Reference:</strong> ${escapeHtml(args.referenceNo)}</p>` : ""}</div><table style="width:100%;border-collapse:collapse"><thead><tr><th style="padding:8px 10px;text-align:left;background:#f3f4f6">Payment For</th><th style="padding:8px 10px;text-align:right;background:#f3f4f6">Amount Paid</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td style="padding:12px 10px;font-weight:700">Total Received</td><td style="padding:12px 10px;text-align:right;font-weight:700">${escapeHtml(money.format(args.amount))}</td></tr></tfoot></table><p style="margin-top:20px;text-align:center"><a href="${escapeHtml(receiptUrl)}" style="display:inline-block;padding:10px 16px;background:#172033;color:white;text-decoration:none;border-radius:8px">View / Print / Save PDF Receipt</a></p><p style="font-size:12px;color:#6b7280;text-align:center;margin-top:18px">Computer-generated receipt. Please retain it for your records.</p></div>`;
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ sender: { name: instituteName, email: senderEmail }, to: [...recipients].map((email) => ({ email })), subject: `Fee Receipt ${args.receiptNo} - ${instituteName}`, htmlContent: html }) });
    return response.ok ? "sent" : "failed";
  } catch { return "failed"; }
}

export async function createFeeAssignment(input: unknown): Promise<FeeActionResult> { const parsed = feeAssignmentSchema.safeParse(input); if (!parsed.success) return { status: "error", message: "Please correct the Fee Assignment details.", fieldErrors: fields(parsed.error.flatten().fieldErrors) }; await admin(); const supabase = await createClient(); const v = parsed.data; const { data, error } = await supabase.rpc("create_student_fee_assignment", { p_student_id: v.studentId, p_academic_year_id: v.academicYearId, p_fee_head_id: v.feeHeadId, p_amount: v.amount, p_discount_type: null, p_discount_value: 0, p_effective_from: v.effectiveFrom, p_effective_to: null, p_installments: v.installments.map((x) => ({ installment_no: x.installmentNo, due_date: x.dueDate, gross_amount: x.grossAmount, discount_amount: 0, net_amount: x.grossAmount })) }); if (error) return errorResult(error); refresh(); return { status: "success", message: "Student fee assigned.", data }; }
export async function postFeePayment(input: unknown): Promise<FeeActionResult<{ paymentId: string; receiptNo: string }>> {
  const parsed = feePaymentSchema.safeParse(input); if (!parsed.success) return { status: "error", message: "Please correct the payment details.", fieldErrors: fields(parsed.error.flatten().fieldErrors) };
  const profile = await admin(); const supabase = await createClient(); const v = parsed.data;
  const { data, error } = await supabase.rpc("post_fee_payment", { p_student_id: v.studentId, p_academic_year_id: v.academicYearId, p_payment_mode_id: v.paymentModeId, p_payment_date: v.paymentDate, p_reference_no: v.referenceNo, p_remarks: v.remarks, p_allocations: v.allocations.map((x) => ({ due_id: x.dueId, amount: x.amount })) });
  if (error) return errorResult(error);
  const result = data as { paymentId: string; receiptNo: string; amount?: number };
  const deliveryNotes: string[] = [];
  if (v.receiptDelivery === "whatsapp" || v.receiptDelivery === "both") {
    const { data: whatsAppStatus, error: whatsAppError } = await supabase.rpc("fee_queue_confirmation", { p_payment_id: result.paymentId, p_institute_id: profile.instituteId, p_student_id: v.studentId, p_initiated_by: profile.id });
    if (whatsAppError || whatsAppStatus === "no_recipient") deliveryNotes.push("WhatsApp receipt could not be queued because no eligible mobile number was found.");
    else deliveryNotes.push("WhatsApp receipt queued.");
  }
  if (v.receiptDelivery === "email" || v.receiptDelivery === "both") {
    const emailStatus = await sendReceiptEmail({ instituteId: profile.instituteId!, instituteName: profile.instituteName, studentId: v.studentId, paymentId: result.paymentId, receiptNo: result.receiptNo, paymentDate: v.paymentDate, amount: Number(result.amount ?? v.allocations.reduce((sum, item) => sum + item.amount, 0)), paymentModeId: v.paymentModeId, referenceNo: v.referenceNo, allocations: v.allocations });
    if (emailStatus === "sent") deliveryNotes.push("Email receipt sent.");
    else if (emailStatus === "no_email") deliveryNotes.push("Email receipt was not sent because neither Student nor Parent has an email address.");
    else if (emailStatus === "not_configured") deliveryNotes.push("Email receipt was not sent because Brevo email settings are unavailable.");
    else deliveryNotes.push("Email receipt could not be sent.");
  }
  refresh();
  return { status: "success", message: `Payment posted. Receipt ${result.receiptNo}.${deliveryNotes.length ? ` ${deliveryNotes.join(" ")}` : ""}`, data: { paymentId: result.paymentId, receiptNo: result.receiptNo } };
}
export async function reverseFeePayment(input: unknown): Promise<FeeActionResult> { const parsed = reversalSchema.safeParse(input); if (!parsed.success) return { status: "error", message: "Provide a valid reversal reason." }; await admin(); const supabase = await createClient(); const { error } = await supabase.rpc("reverse_fee_payment", { p_payment_id: parsed.data.paymentId, p_reason: parsed.data.reason }); if (error) return errorResult(error); refresh(); return { status: "success", message: "Payment reversed. The original receipt remains in the audit history." }; }

export async function adjustSecurityDeposit(input: { studentId: string; dueId: string; amount: number; remarks?: string | null }): Promise<FeeActionResult> { await admin(); const supabase = await createClient(); const { data, error } = await supabase.rpc("adjust_security_deposit_to_due", { p_student_id: input.studentId, p_due_id: input.dueId, p_amount: input.amount, p_remarks: input.remarks ?? null }); if (error) return errorResult(error); refresh(); const result = data as { remainingDeposit?: number; remainingDue?: number }; return { status: "success", message: `Security Deposit adjusted. Remaining deposit ₹${Number(result.remainingDeposit ?? 0).toFixed(2)}.` }; }
export async function refundSecurityDeposit(input: { studentId: string; amount: number; referenceNo?: string | null; remarks?: string | null }): Promise<FeeActionResult> { await admin(); const supabase = await createClient(); const { data, error } = await supabase.rpc("refund_security_deposit", { p_student_id: input.studentId, p_amount: input.amount, p_reference_no: input.referenceNo ?? null, p_remarks: input.remarks ?? null }); if (error) return errorResult(error); refresh(); const result = data as { remainingDeposit?: number }; return { status: "success", message: `Security Deposit refund recorded. Remaining deposit ₹${Number(result.remainingDeposit ?? 0).toFixed(2)}.` }; }

export async function queueManualFeeReminder(input: unknown): Promise<FeeActionResult> { const parsed = reminderSchema.safeParse(input); if (!parsed.success) return { status: "error", message: "Fee due not found." }; await admin(); const supabase = await createClient(); const { error } = await supabase.rpc("queue_manual_fee_reminder", { p_due_id: parsed.data.dueId }); if (error) return errorResult(error); revalidatePath("/fees/messages"); revalidatePath("/fees/student-fees"); return { status: "success", message: "WhatsApp reminder queued for delivery." }; }
export async function queueOverdueFeeReminders(): Promise<FeeActionResult> { await admin(); const supabase = await createClient(); const { data, error } = await supabase.rpc("queue_overdue_fee_whatsapp_reminders", {}); if (error) return errorResult(error); revalidatePath("/fees/messages"); const count = Number((data as { queuedCount?: number }).queuedCount ?? 0); return { status: "success", message: `${count} pending-fee reminder${count === 1 ? "" : "s"} queued.` }; }

export async function uploadFeeQrCode(formData: FormData): Promise<FeeActionResult<{ url: string }>> { const profile = await admin(); const file = formData.get("file"); if (!(file instanceof File) || file.size === 0) return { status: "error", message: "Select a QR code image to upload." }; if (!new Set(["image/png", "image/jpeg", "image/webp"]).has(file.type)) return { status: "error", message: "QR code must be a PNG, JPG, or WebP image." }; if (file.size > 2 * 1024 * 1024) return { status: "error", message: "QR code image must be 2 MB or smaller." }; const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"; const path = `${profile.instituteId}/payment-qr-${Date.now()}.${extension}`; const supabase = await createClient(); const { data: oldSettings } = await supabase.from("fee_settings").select("qr_code_path").eq("institute_id", profile.instituteId).maybeSingle(); const { error: uploadError } = await supabase.storage.from("fee-payment-assets").upload(path, file, { contentType: file.type, cacheControl: "3600" }); if (uploadError) return { status: "error", message: `QR upload failed: ${uploadError.message}` }; const { data } = supabase.storage.from("fee-payment-assets").getPublicUrl(path); const { error: updateError } = await supabase.from("fee_settings").update({ qr_code_url: data.publicUrl, qr_code_path: path, updated_by: profile.id, updated_at: new Date().toISOString() }).eq("institute_id", profile.instituteId); if (updateError) { await supabase.storage.from("fee-payment-assets").remove([path]); return errorResult(updateError); } if (oldSettings?.qr_code_path && oldSettings.qr_code_path !== path) await supabase.storage.from("fee-payment-assets").remove([oldSettings.qr_code_path]); refresh(); return { status: "success", message: "Payment QR code uploaded.", data: { url: data.publicUrl } }; }
export async function updateFeeSettings(input: unknown): Promise<FeeActionResult> { const parsed = settingsSchema.safeParse(input); if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Please correct the fee settings.", fieldErrors: fields(parsed.error.flatten().fieldErrors) }; const profile = await admin(); const supabase = await createClient(); const v = parsed.data; const { error } = await supabase.from("fee_settings").update({ default_monthly_due_day: v.defaultMonthlyDueDay, whatsapp_fee_reminders_enabled: v.whatsappFeeRemindersEnabled, reminder_after_due_days: v.reminderAfterDueDays, repeat_every_days: v.repeatEveryDays, max_reminders_per_due: v.maxRemindersPerDue, whatsapp_payment_confirmations_enabled: v.whatsappPaymentConfirmationsEnabled, recipient_preference: v.recipientPreference, reminder_template_name: v.reminderTemplateName, confirmation_template_name: v.confirmationTemplateName, reminder_message_format: v.reminderMessageFormat, confirmation_message_format: v.confirmationMessageFormat, upi_id: v.upiId, bank_name: v.bankName, bank_account_name: v.bankAccountName, bank_account_number: v.bankAccountNumber, bank_ifsc: v.bankIfsc, bank_branch: v.bankBranch, qr_code_url: v.qrCodeUrl, qr_code_path: v.qrCodePath, updated_by: profile.id, updated_at: new Date().toISOString() }).eq("institute_id", profile.instituteId); if (error) return errorResult(error); refresh(); return { status: "success", message: "Fee payment details and WhatsApp message formats updated." }; }

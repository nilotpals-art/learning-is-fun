import "server-only";

import type { AuthProfile } from "@/features/auth/types/auth";
import type { FeeDue, FeeMessage, FeeOption, FeePayment, FeeSettings, FeeStudent, FeeSummary, SecurityDepositBalance, SecurityDepositEntry } from "@/features/fees/types/fees";
import { createClient } from "@/lib/supabase/server";

const one = <T>(value: T | T[] | null): T | null => !value ? null : Array.isArray(value) ? value[0] ?? null : value;
function scope(profile: AuthProfile): string { if (!profile.instituteId) throw new Error("FEES_UNAUTHORIZED"); return profile.instituteId; }
function check(error: { message: string } | null): void { if (error) throw error; }

export async function getFeeReferenceData(profile: AuthProfile) {
  const instituteId = scope(profile); const supabase = await createClient();
  const [students, years, heads, modes] = await Promise.all([
    supabase.from("students").select("id,name,admission_no").eq("institute_id", instituteId).eq("status", "Active").order("name"),
    supabase.from("academic_years").select("id,name").eq("institute_id", instituteId).eq("is_active", true).order("start_date", { ascending: false }),
    supabase.from("fee_heads").select("id,name").eq("institute_id", instituteId).eq("is_active", true).order("display_order"),
    supabase.from("payment_modes").select("id,name").eq("institute_id", instituteId).eq("is_active", true).order("display_order"),
  ]);
  check(students.error ?? years.error ?? heads.error ?? modes.error);
  return {
    students: (students.data ?? []).map((x) => ({ id: x.id, name: x.name, admissionNo: x.admission_no })) as FeeStudent[],
    academicYears: (years.data ?? []) as FeeOption[], feeHeads: (heads.data ?? []) as FeeOption[], paymentModes: (modes.data ?? []) as FeeOption[],
  };
}

export async function listFeeDues(profile: AuthProfile, studentId?: string | string[]): Promise<FeeDue[]> {
  const instituteId = scope(profile); const supabase = await createClient();
  let query = supabase.from("student_fee_dues").select("id,student_id,academic_year_id,due_date,net_amount,status,assignment:student_fee_assignments!student_fee_dues_assignment_fkey(student:students!student_fee_assignments_student_id_fkey(name,admission_no),year:academic_years!student_fee_assignments_academic_year_id_fkey(name),head:fee_heads!student_fee_assignments_fee_head_id_fkey(name),structure_item:class_fee_structure_items!student_fee_assignments_class_fee_structure_item_id_fkey(schedule_type)),allocations:fee_payment_allocations!fee_payment_allocations_due_fkey(amount,payment:fee_payments!fee_payment_allocations_payment_fkey(status)),deposit_adjustments:student_security_deposit_entries!student_security_deposit_entries_target_due_id_fkey(amount,entry_type)").eq("institute_id", instituteId).order("due_date");
  if (Array.isArray(studentId)) query = query.in("student_id", studentId); else if (studentId) query = query.eq("student_id", studentId);
  const { data, error } = await query; check(error);
  return (data ?? []).map((row) => {
    const assignment = one(row.assignment); const student = one(assignment?.student ?? null); const year = one(assignment?.year ?? null); const head = one(assignment?.head ?? null); const structureItem = one(assignment?.structure_item ?? null);
    const paid = (row.allocations ?? []).reduce((sum, allocation) => sum + (one(allocation.payment)?.status === "posted" ? Number(allocation.amount) : 0), 0);
    const adjusted = (row.deposit_adjustments ?? []).reduce((sum, entry) => sum + (entry.entry_type === "adjustment" ? Number(entry.amount) : 0), 0);
    return { id: row.id, studentId: row.student_id, studentName: student?.name ?? "STUDENT", admissionNo: student?.admission_no ?? null, academicYearId: row.academic_year_id, academicYearName: year?.name ?? "ACADEMIC YEAR", feeHeadName: head?.name ?? "FEE", dueDate: row.due_date, netAmount: Number(row.net_amount), outstanding: Math.max(Number(row.net_amount) - paid - adjusted, 0), status: row.status, scheduleType: (structureItem?.schedule_type ?? null) as FeeDue["scheduleType"] };
  });
}

export async function listFeePayments(profile: AuthProfile, studentId?: string | string[]): Promise<FeePayment[]> {
  const instituteId = scope(profile); const supabase = await createClient(); let query = supabase.from("fee_payments").select("id,student_id,academic_year_id,payment_date,amount,receipt_no,reference_no,remarks,status,reversal_reason,student:students(name),year:academic_years(name),mode:payment_modes(name)").eq("institute_id", instituteId).order("payment_date", { ascending: false });
  if (Array.isArray(studentId)) query = query.in("student_id", studentId); else if (studentId) query = query.eq("student_id", studentId);
  const { data, error } = await query; check(error);
  return (data ?? []).map((row) => ({ id: row.id, studentId: row.student_id, academicYearId: row.academic_year_id, studentName: one(row.student)?.name ?? "STUDENT", academicYearName: one(row.year)?.name ?? "ACADEMIC YEAR", paymentModeName: one(row.mode)?.name ?? "PAYMENT MODE", paymentDate: row.payment_date, amount: Number(row.amount), receiptNo: row.receipt_no, referenceNo: row.reference_no, remarks: row.remarks, status: row.status as FeePayment["status"], reversalReason: row.reversal_reason }));
}

export async function listSecurityDeposits(profile: AuthProfile): Promise<{ balances: SecurityDepositBalance[]; entries: SecurityDepositEntry[] }> {
  const instituteId = scope(profile); const supabase = await createClient();
  const { data, error } = await supabase.from("student_security_deposit_entries").select("id,student_id,entry_type,amount,target_due_id,reference_no,remarks,created_at,student:students(name,admission_no)").eq("institute_id", instituteId).order("created_at", { ascending: false }); check(error);
  const entries = (data ?? []).map((row) => ({ id: row.id, studentId: row.student_id, studentName: one(row.student)?.name ?? "STUDENT", admissionNo: one(row.student)?.admission_no ?? null, entryType: row.entry_type as SecurityDepositEntry["entryType"], amount: Number(row.amount), targetDueId: row.target_due_id, referenceNo: row.reference_no, remarks: row.remarks, createdAt: row.created_at }));
  const balancesByStudent = new Map<string, SecurityDepositBalance>();
  for (const entry of entries) { const current = balancesByStudent.get(entry.studentId) ?? { studentId: entry.studentId, studentName: entry.studentName, admissionNo: entry.admissionNo, balance: 0 }; current.balance += entry.entryType === "credit" ? entry.amount : -entry.amount; balancesByStudent.set(entry.studentId, current); }
  return { balances: [...balancesByStudent.values()].sort((a,b) => a.studentName.localeCompare(b.studentName)), entries };
}

export async function getFeeSummary(profile: AuthProfile): Promise<FeeSummary> { scope(profile); const supabase = await createClient(); const { data, error } = await supabase.rpc("fee_dashboard_summary"); check(error); const value = data as Record<string, number>; return { totalOutstanding: Number(value.totalOutstanding ?? 0), collectionsToday: Number(value.collectionsToday ?? 0), collectionsThisMonth: Number(value.collectionsThisMonth ?? 0), studentsOutstanding: Number(value.studentsOutstanding ?? 0), overdueCount: Number(value.overdueCount ?? 0), queuedMessages: Number(value.queuedMessages ?? 0) }; }

export async function getFeeSettings(profile: AuthProfile): Promise<FeeSettings> {
  const instituteId = scope(profile); const supabase = await createClient(); const { data, error } = await supabase.from("fee_settings").select("*").eq("institute_id", instituteId).single(); check(error);
  return { defaultMonthlyDueDay: data.default_monthly_due_day ?? 15, whatsappFeeRemindersEnabled: data.whatsapp_fee_reminders_enabled, reminderAfterDueDays: data.reminder_after_due_days, repeatEveryDays: data.repeat_every_days, maxRemindersPerDue: data.max_reminders_per_due, whatsappPaymentConfirmationsEnabled: data.whatsapp_payment_confirmations_enabled, recipientPreference: data.recipient_preference, reminderTemplateName: data.reminder_template_name, confirmationTemplateName: data.confirmation_template_name, reminderMessageFormat: data.reminder_message_format ?? "Dear {student_name}, your {fee_head} of {outstanding_amount} is pending from {due_date}. Please make payment at the earliest. - {institute_name}", confirmationMessageFormat: data.confirmation_message_format ?? "Payment received for {student_name}. Receipt {receipt_no}, Date {payment_date}, Amount {amount}, Mode {payment_mode}, Ref {reference_no}. Pending balance: {remaining_outstanding}. Thank you - {institute_name}", upiId: data.upi_id ?? null, bankName: data.bank_name ?? null, bankAccountName: data.bank_account_name ?? null, bankAccountNumber: data.bank_account_number ?? null, bankIfsc: data.bank_ifsc ?? null, bankBranch: data.bank_branch ?? null, qrCodeUrl: data.qr_code_url ?? null, qrCodePath: data.qr_code_path ?? null };
}

export async function listFeeMessages(profile: AuthProfile): Promise<FeeMessage[]> { const instituteId = scope(profile); const supabase = await createClient(); const { data, error } = await supabase.from("fee_message_outbox").select("id,message_type,recipient_type,recipient_phone,status,attempt_count,created_at,last_error_code,student:students(name)").eq("institute_id", instituteId).order("created_at", { ascending: false }).limit(200); check(error); return (data ?? []).map((row) => ({ id: row.id, studentName: one(row.student)?.name ?? "STUDENT", messageType: row.message_type, recipientType: row.recipient_type, recipientPhone: row.recipient_phone, status: row.status, attemptCount: row.attempt_count, createdAt: row.created_at, lastErrorCode: row.last_error_code })); }

export async function getStudentIdForProfile(profile: AuthProfile): Promise<string> { const instituteId = scope(profile); const supabase = await createClient(); const { data, error } = await supabase.from("students").select("id").eq("institute_id", instituteId).eq("profile_id", profile.id).maybeSingle(); check(error); if (!data) throw new Error("STUDENT_NOT_FOUND"); return data.id; }
export async function getParentStudentIds(profile: AuthProfile): Promise<string[]> { const instituteId = scope(profile); const supabase = await createClient(); const { data: parent, error: parentError } = await supabase.from("parents").select("id").eq("institute_id", instituteId).eq("profile_id", profile.id).maybeSingle(); check(parentError); if (!parent) return []; const { data, error } = await supabase.from("student_parent_links").select("student_id").eq("institute_id", instituteId).eq("parent_id", parent.id); check(error); return (data ?? []).map((row) => row.student_id); }

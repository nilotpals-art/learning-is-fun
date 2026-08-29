import "server-only";

import { createClient } from "@supabase/supabase-js";

import { sendWhatsAppTemplate } from "@/features/fees/services/whatsapp-service";
import { WHATSAPP_TEMPLATES } from "@/features/whatsapp/templates";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("FEES_WORKER_NOT_CONFIGURED");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

const one = <T>(value: T | T[] | null): T | null => !value ? null : Array.isArray(value) ? value[0] ?? null : value;
const isoDate = (value: Date) => value.toISOString().slice(0, 10);
const displayDate = (value: string) => new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(`${value}T00:00:00+05:30`)).toUpperCase();
const displayMonth = (value: string) => new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(`${value}T00:00:00+05:30`)).toUpperCase();

type OutboxMessage = {
  id: string;
  message_type: string;
  recipient_phone: string | null;
  template_name: string | null;
  template_parameters: unknown;
  attempt_count: number;
};

function templateNameFor(messageType: string, storedName: string | null): string {
  if (messageType === "fee_reminder") return WHATSAPP_TEMPLATES.feesPaymentReminder.name;
  if (messageType === "payment_confirmation") return WHATSAPP_TEMPLATES.feesPaymentConfirmation.name;
  if (messageType === "fee_receipt") return WHATSAPP_TEMPLATES.feesReceipt.name;
  return storedName ?? "";
}

function templateParameterOrder(messageType: string, values: Record<string, unknown>): Array<string | number | null | undefined> {
  if (messageType === "fee_reminder") {
    return [values.outstanding_amount, values.student_name, values.fee_month, values.fee_head, values.due_date] as Array<string | number | null | undefined>;
  }
  if (messageType === "payment_confirmation") {
    return [values.amount, values.student_name, values.fee_month, values.fee_head, values.receipt_no, values.payment_date, values.payment_mode] as Array<string | number | null | undefined>;
  }
  if (messageType === "fee_receipt") {
    return [values.student_name, values.receipt_no, values.amount, values.fee_month, values.fee_head, values.payment_date, values.payment_mode] as Array<string | number | null | undefined>;
  }
  return Object.values(values).map((value) => value == null || typeof value === "string" || typeof value === "number" ? value as string | number | null | undefined : JSON.stringify(value));
}

async function deliverMessage(supabase: ReturnType<typeof serviceClient>, message: OutboxMessage): Promise<"sent" | "failed" | "skipped"> {
  const templateName = templateNameFor(message.message_type, message.template_name);
  if (!message.recipient_phone || !templateName) return "skipped";

  const claimed = await supabase
    .from("fee_message_outbox")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", message.id)
    .in("status", ["queued", "failed"])
    .select("id")
    .maybeSingle();
  if (claimed.error || !claimed.data) return "skipped";

  const values = (message.template_parameters ?? {}) as Record<string, unknown>;
  const result = await sendWhatsAppTemplate({
    to: message.recipient_phone,
    templateName,
    parameters: templateParameterOrder(message.message_type, values),
  });

  if (result.status === "sent") {
    const { error: updateError } = await supabase.from("fee_message_outbox").update({
      status: "sent",
      attempt_count: Number(message.attempt_count) + 1,
      provider_message_id: result.providerMessageId ?? null,
      last_error_code: null,
      last_error_message: null,
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", message.id);
    if (updateError) throw updateError;
    return "sent";
  }

  const { error: updateError } = await supabase.from("fee_message_outbox").update({
    status: "failed",
    attempt_count: Number(message.attempt_count) + 1,
    last_error_code: result.errorCode ?? result.status,
    last_error_message: result.errorMessage ?? "WhatsApp delivery is not configured.",
    updated_at: new Date().toISOString(),
  }).eq("id", message.id);
  if (updateError) throw updateError;
  return "failed";
}

async function outstandingForDue(supabase: ReturnType<typeof serviceClient>, instituteId: string, dueId: string, netAmount: number): Promise<number> {
  const { data, error } = await supabase.from("fee_payment_allocations").select("amount,payment:fee_payments!fee_payment_allocations_payment_fkey(status)").eq("institute_id", instituteId).eq("student_fee_due_id", dueId);
  if (error) throw error;
  const paid = (data ?? []).reduce((sum, allocation) => sum + (one(allocation.payment)?.status === "posted" ? Number(allocation.amount) : 0), 0);
  return Math.max(netAmount - paid, 0);
}

async function chooseRecipient(supabase: ReturnType<typeof serviceClient>, instituteId: string, studentId: string, preference: string) {
  const { data: student, error: studentError } = await supabase.from("students").select("id,name,mobile").eq("id", studentId).eq("institute_id", instituteId).maybeSingle();
  if (studentError) throw studentError;
  const { data: links, error: linkError } = await supabase.from("student_parent_links").select("parent_id").eq("institute_id", instituteId).eq("student_id", studentId).limit(1);
  if (linkError) throw linkError;
  const parentId = links?.[0]?.parent_id ?? null;
  let parent: { id: string; name: string; mobile: string | null } | null = null;
  if (parentId) {
    const result = await supabase.from("parents").select("id,name,mobile").eq("id", parentId).eq("institute_id", instituteId).eq("is_active", true).maybeSingle();
    if (result.error) throw result.error;
    parent = result.data;
  }
  const parentPhone = parent?.mobile?.trim(); const studentPhone = student?.mobile?.trim();
  if ((preference === "parent" || preference === "both") && parentPhone) return { type: "parent", phone: parentPhone, parentId: parent!.id, studentName: student?.name ?? "Student" };
  if (studentPhone) return { type: "student", phone: studentPhone, parentId: null, studentName: student?.name ?? "Student" };
  return null;
}

export async function queueScheduledPendingFeeReminders(asOf = new Date()): Promise<number> {
  const supabase = serviceClient();
  const { data: settingsRows, error: settingsError } = await supabase.from("fee_settings").select("institute_id,reminder_after_due_days,repeat_every_days,max_reminders_per_due,recipient_preference").eq("whatsapp_fee_reminders_enabled", true);
  if (settingsError) throw settingsError;
  let queued = 0;
  for (const settings of settingsRows ?? []) {
    const cutoff = new Date(asOf); cutoff.setUTCDate(cutoff.getUTCDate() - Number(settings.reminder_after_due_days ?? 0));
    const { data: dues, error: duesError } = await supabase.from("student_fee_dues").select("id,student_id,due_date,net_amount,fee_head:fee_heads(name)").eq("institute_id", settings.institute_id).in("status", ["due", "partially_paid"]).lte("due_date", isoDate(cutoff));
    if (duesError) throw duesError;
    for (const due of dues ?? []) {
      const outstanding = await outstandingForDue(supabase, settings.institute_id, due.id, Number(due.net_amount));
      if (outstanding <= 0) continue;
      const { data: history, error: historyError } = await supabase.from("fee_message_outbox").select("scheduled_for,status").eq("institute_id", settings.institute_id).eq("student_fee_due_id", due.id).eq("message_type", "fee_reminder").neq("status", "cancelled").order("scheduled_for", { ascending: false });
      if (historyError) throw historyError;
      const count = history?.length ?? 0;
      if (settings.max_reminders_per_due && count >= settings.max_reminders_per_due) continue;
      if (history?.[0]?.scheduled_for) {
        if (!settings.repeat_every_days) continue;
        const next = new Date(history[0].scheduled_for); next.setUTCDate(next.getUTCDate() + settings.repeat_every_days);
        if (next > asOf) continue;
      }
      const recipient = await chooseRecipient(supabase, settings.institute_id, due.student_id, settings.recipient_preference);
      if (!recipient) continue;
      const idempotencyKey = `scheduled_reminder:${due.id}:${isoDate(asOf)}:${recipient.type}`;
      const { error: insertError } = await supabase.from("fee_message_outbox").upsert({
        institute_id: settings.institute_id,
        student_id: due.student_id,
        parent_id: recipient.parentId,
        student_fee_due_id: due.id,
        message_type: "fee_reminder",
        recipient_type: recipient.type,
        recipient_phone: recipient.phone,
        template_name: WHATSAPP_TEMPLATES.feesPaymentReminder.name,
        template_parameters: {
          outstanding_amount: outstanding,
          student_name: recipient.studentName,
          fee_month: displayMonth(due.due_date),
          fee_head: one(due.fee_head)?.name ?? "Fee",
          due_date: displayDate(due.due_date),
        },
        idempotency_key: idempotencyKey,
        scheduled_for: asOf.toISOString(),
        status: "queued",
      }, { onConflict: "institute_id,idempotency_key", ignoreDuplicates: true });
      if (insertError) throw insertError;
      queued += 1;
    }
  }
  return queued;
}

export async function deliverPaymentConfirmationImmediately(paymentId: string, instituteId: string): Promise<{ sent: number; failed: number; skipped: number }> {
  const supabase = serviceClient();
  const { data: messages, error } = await supabase
    .from("fee_message_outbox")
    .select("id,message_type,recipient_phone,template_name,template_parameters,attempt_count")
    .eq("institute_id", instituteId)
    .eq("fee_payment_id", paymentId)
    .eq("message_type", "payment_confirmation")
    .in("status", ["queued", "failed"])
    .lt("attempt_count", 3);
  if (error) throw error;

  let sent = 0, failed = 0, skipped = 0;
  for (const message of (messages ?? []) as OutboxMessage[]) {
    const status = await deliverMessage(supabase, message);
    if (status === "sent") sent += 1;
    else if (status === "failed") failed += 1;
    else skipped += 1;
  }
  return { sent, failed, skipped };
}

export async function deliverFeeWhatsAppOutbox(limit = 50): Promise<{ sent: number; failed: number; skipped: number }> {
  const supabase = serviceClient();
  const { data: messages, error } = await supabase.from("fee_message_outbox").select("id,message_type,recipient_phone,template_name,template_parameters,attempt_count").in("status", ["queued", "failed"]).lte("scheduled_for", new Date().toISOString()).lt("attempt_count", 3).order("scheduled_for").limit(limit);
  if (error) throw error;
  let sent = 0, failed = 0, skipped = 0;
  for (const message of (messages ?? []) as OutboxMessage[]) {
    const status = await deliverMessage(supabase, message);
    if (status === "sent") sent += 1;
    else if (status === "failed") failed += 1;
    else skipped += 1;
  }
  return { sent, failed, skipped };
}

export async function runFeeReminderWorker() {
  const queued = await queueScheduledPendingFeeReminders();
  const delivery = await deliverFeeWhatsAppOutbox();
  return { queued, ...delivery };
}

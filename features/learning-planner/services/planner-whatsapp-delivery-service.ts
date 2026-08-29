import "server-only";

import { sendApprovedWhatsAppTemplate } from "@/features/whatsapp/template-delivery-service";
import { createClient } from "@/lib/supabase/server";

export type PlannerClassWhatsAppKind = "cancelled" | "cancelled_reschedule_later" | "rescheduled";

export type PlannerClassWhatsAppResult = {
  status: "sent" | "partial" | "no_recipients" | "not_configured" | "failed";
  sent: number;
  failed: number;
};

type StudentContact = { id: string; name: string; mobile: string | null; status: string };
type ParentContact = { mobile: string | null; is_active: boolean };

function one<T>(value: T | T[] | null | undefined): T | null {
  return !value ? null : Array.isArray(value) ? value[0] ?? null : value;
}

function displayDate(date: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(`${date}T00:00:00+05:30`));
}

function displayTime(date: string, time: string | null): string {
  if (!time) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(new Date(`${date}T${time.slice(0, 8)}+05:30`));
}

function normalizePhone(value: string): string {
  const digits = value.replace(/[^0-9]/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

export async function sendPlannerClassWhatsApp(
  eventId: string,
  kind: PlannerClassWhatsAppKind,
): Promise<PlannerClassWhatsAppResult> {
  const supabase = await createClient();
  const { data: event, error: eventError } = await supabase
    .from("schedule_events")
    .select("id,institute_id,batch_id,event_date,start_time,title,subject:subjects!schedule_events_subject_fkey(subject_name),batch:batches!schedule_events_batch_fkey(name)")
    .eq("id", eventId)
    .maybeSingle();
  if (eventError || !event) return { status: "failed", sent: 0, failed: 1 };
  if (!event.batch_id) return { status: "no_recipients", sent: 0, failed: 0 };

  const { data: assignmentRows, error: assignmentError } = await supabase
    .from("student_assignments")
    .select("student_id,student:students!student_assignments_student_fkey(id,name,mobile,status)")
    .eq("institute_id", event.institute_id)
    .eq("batch_id", event.batch_id)
    .lte("effective_from", event.event_date)
    .or(`effective_to.is.null,effective_to.gte.${event.event_date}`);
  if (assignmentError) return { status: "failed", sent: 0, failed: 1 };

  const students = (assignmentRows ?? [])
    .map((row) => one(row.student) as StudentContact | null)
    .filter((student): student is StudentContact => Boolean(student && student.status === "Active"));
  if (students.length === 0) return { status: "no_recipients", sent: 0, failed: 0 };

  const studentIds = [...new Set(students.map((student) => student.id))];
  const { data: parentRows, error: parentError } = await supabase
    .from("student_parent_links")
    .select("student_id,parent:parents!student_parent_links_parent_fkey(mobile,is_active)")
    .eq("institute_id", event.institute_id)
    .in("student_id", studentIds);
  if (parentError) return { status: "failed", sent: 0, failed: 1 };

  const parentsByStudent = new Map<string, ParentContact[]>();
  for (const row of parentRows ?? []) {
    const parent = one(row.parent) as ParentContact | null;
    if (!parent?.is_active || !parent.mobile?.trim()) continue;
    const list = parentsByStudent.get(row.student_id) ?? [];
    list.push(parent);
    parentsByStudent.set(row.student_id, list);
  }

  const subject = one(event.subject)?.subject_name ?? event.title;
  const batchName = one(event.batch)?.name ?? "Batch";
  const date = displayDate(event.event_date);
  const time = displayTime(event.event_date, event.start_time);
  let sent = 0;
  let failed = 0;
  let notConfigured = 0;

  for (const student of students) {
    const recipients = new Map<string, string>();
    if (student.mobile?.trim()) recipients.set(normalizePhone(student.mobile), student.mobile.trim());
    for (const parent of parentsByStudent.get(student.id) ?? []) {
      if (parent.mobile?.trim()) recipients.set(normalizePhone(parent.mobile), parent.mobile.trim());
    }

    const templateKey = kind === "cancelled"
      ? "classCancellation"
      : kind === "cancelled_reschedule_later"
        ? "classCancelledRescheduleLater"
        : "classReschedule";
    const parameters = kind === "rescheduled"
      ? [subject, student.name, batchName, date, time]
      : [subject, student.name, date, time, batchName];

    for (const phone of recipients.values()) {
      const delivery = await sendApprovedWhatsAppTemplate(phone, templateKey, parameters);
      if (delivery.status === "sent") sent += 1;
      else if (delivery.status === "not_configured") notConfigured += 1;
      else {
        failed += 1;
        console.error("Planner WhatsApp delivery failed", { eventId, kind, studentId: student.id, error: delivery.error });
      }
    }
  }

  if (sent > 0 && failed === 0 && notConfigured === 0) return { status: "sent", sent, failed };
  if (sent > 0) return { status: "partial", sent, failed: failed + notConfigured };
  if (notConfigured > 0 && failed === 0) return { status: "not_configured", sent: 0, failed: 0 };
  if (failed > 0) return { status: "failed", sent: 0, failed };
  return { status: "no_recipients", sent: 0, failed: 0 };
}

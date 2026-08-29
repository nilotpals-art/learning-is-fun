"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { loadAttendanceRoster, saveDailyAttendance, updateStudentAttendance } from "@/features/attendance/services/attendance-service";
import type { AttendanceActionResult, LoadAttendanceResult } from "@/features/attendance/types/attendance";
import { attendanceFilterSchema, saveAttendanceSchema, updateAttendanceSchema } from "@/features/attendance/validations/attendance-schema";
import { sendApprovedWhatsAppTemplate } from "@/features/whatsapp/template-delivery-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

const errorMessages: Record<string, string> = {
  ATTENDANCE_UNAUTHORIZED: "You are not authorised to manage Attendance.",
  ATTENDANCE_DATE_REQUIRED: "Select an Attendance Date.",
  ATTENDANCE_ACADEMIC_YEAR_INVALID: "The selected Academic Year is inactive, unavailable, or does not include this date.",
  ATTENDANCE_BATCH_INVALID: "The selected Batch is inactive or unavailable.",
  ATTENDANCE_ROSTER_EMPTY: "No Students are assigned to this Batch on the selected date.",
  ATTENDANCE_ROSTER_MISMATCH: "The Student roster changed or contains an invalid assignment. Reload Students and try again.",
  ATTENDANCE_ENTRIES_INVALID: "The submitted Attendance roster is invalid.",
  ATTENDANCE_ENTRIES_DUPLICATE: "The submitted Attendance roster contains duplicate Students.",
  ATTENDANCE_ENTRY_INVALID: "Enter a valid Attendance status and remarks.",
  ATTENDANCE_ALREADY_RECORDED: "Attendance already recorded for this batch and date.",
  ATTENDANCE_NOT_FOUND: "Attendance record not found.",
};

interface StudentRow { id: string; name: string }
interface ParentRow { mobile: string | null; is_active: boolean }
interface ParentLinkRow { student_id: string; parent: ParentRow | ParentRow[] | null }
interface AttendanceSnapshot { student_id: string; attendance_date: string; batch_id: string; status: string }

function databaseMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : "";
  const code = Object.keys(errorMessages).find((key) => message.includes(key));
  return code ? errorMessages[code] : fallback;
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatAttendanceDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })
    .format(new Date(`${value}T00:00:00+05:30`));
}

async function requireAttendanceAdmin(): Promise<string> {
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) redirect("/unauthorized");
  return profile.instituteId;
}

async function notifyAbsentParents(instituteId: string, studentIds: string[], attendanceDate: string, batchId: string): Promise<void> {
  const ids = [...new Set(studentIds)].filter(Boolean);
  if (ids.length === 0) return;

  try {
    const supabase = await createClient();
    const [studentsResult, batchResult, linksResult] = await Promise.all([
      supabase.from("students").select("id,name").eq("institute_id", instituteId).in("id", ids),
      supabase.from("batches").select("name").eq("institute_id", instituteId).eq("id", batchId).maybeSingle(),
      supabase.from("student_parent_links")
        .select("student_id,parent:parents!student_parent_links_parent_fkey(mobile,is_active)")
        .eq("institute_id", instituteId)
        .in("student_id", ids),
    ]);
    if (studentsResult.error || batchResult.error || linksResult.error) throw new Error("ATTENDANCE_WHATSAPP_LOOKUP_FAILED");

    const studentNames = new Map(((studentsResult.data ?? []) as StudentRow[]).map((student) => [student.id, student.name]));
    const batchName = batchResult.data?.name ?? "Batch";
    const dateText = formatAttendanceDate(attendanceDate);
    const phonesByStudent = new Map<string, Set<string>>();

    for (const link of (linksResult.data ?? []) as unknown as ParentLinkRow[]) {
      const parent = one(link.parent);
      if (!parent?.is_active || !parent.mobile?.trim()) continue;
      const phones = phonesByStudent.get(link.student_id) ?? new Set<string>();
      phones.add(parent.mobile.trim());
      phonesByStudent.set(link.student_id, phones);
    }

    for (const studentId of ids) {
      const studentName = studentNames.get(studentId) ?? "Student";
      for (const phone of phonesByStudent.get(studentId) ?? []) {
        const delivery = await sendApprovedWhatsAppTemplate(phone, "studentAbsent", [studentName, dateText, batchName]);
        if (delivery.status === "failed") {
          console.error("Attendance saved but absent WhatsApp delivery failed", { studentId, error: delivery.error });
        }
      }
    }
  } catch (error) {
    console.error("Attendance saved but absent WhatsApp notification was skipped", {
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

export async function loadAttendance(input: unknown): Promise<LoadAttendanceResult> {
  const parsed = attendanceFilterSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Please correct the Attendance filters.", fieldErrors: parsed.error.flatten().fieldErrors };
  const instituteId = await requireAttendanceAdmin();
  try {
    const entries = await loadAttendanceRoster(instituteId, parsed.data);
    if (entries.length === 0) return { status: "empty", message: "No Students are assigned to this Batch on the selected date." };
    const savedCount = entries.filter((entry) => entry.attendanceId).length;
    if (savedCount === entries.length) return { status: "loaded", recordState: "recorded", entries, message: "Attendance already recorded for this batch and date." };
    if (savedCount > 0) return { status: "loaded", recordState: "inconsistent", entries, message: "Only part of this roster has Attendance. Review the records before making corrections." };
    return { status: "loaded", recordState: "new", entries };
  } catch (error) {
    return { status: "error", message: databaseMessage(error, "We could not load the Attendance roster. Please try again.") };
  }
}

export async function saveAttendance(input: unknown): Promise<AttendanceActionResult> {
  const parsed = saveAttendanceSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Please correct the Attendance roster.", fieldErrors: parsed.error.flatten().fieldErrors };
  const instituteId = await requireAttendanceAdmin();
  try {
    const count = await saveDailyAttendance(parsed.data);
    const absentStudentIds = parsed.data.entries.filter((entry) => entry.status === "Absent").map((entry) => entry.studentId);
    if (absentStudentIds.length > 0) {
      await notifyAbsentParents(instituteId, absentStudentIds, parsed.data.attendanceDate, parsed.data.batchId);
    }
    revalidatePath("/attendance");
    return { status: "success", message: `Attendance recorded for ${count} Student${count === 1 ? "" : "s"}.` };
  } catch (error) {
    const message = databaseMessage(error, "We could not save Attendance. Please try again.");
    return message.startsWith("Attendance already recorded") ? { status: "already_recorded", message } : { status: "error", message };
  }
}

export async function editAttendance(input: unknown): Promise<AttendanceActionResult> {
  const parsed = updateAttendanceSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Please correct the Attendance entry.", fieldErrors: parsed.error.flatten().fieldErrors };
  const instituteId = await requireAttendanceAdmin();
  try {
    const supabase = await createClient();
    const { data: existing, error: existingError } = await supabase
      .from("student_attendance")
      .select("student_id,attendance_date,batch_id,status")
      .eq("institute_id", instituteId)
      .eq("id", parsed.data.attendanceId)
      .maybeSingle();
    if (existingError) throw existingError;

    await updateStudentAttendance(parsed.data);

    const snapshot = existing as AttendanceSnapshot | null;
    if (snapshot && snapshot.status !== "Absent" && parsed.data.status === "Absent") {
      await notifyAbsentParents(instituteId, [snapshot.student_id], snapshot.attendance_date, snapshot.batch_id);
    }

    revalidatePath("/attendance");
    revalidatePath("/attendance/history");
    revalidatePath("/attendance/reports");
    return { status: "success", message: "Attendance updated successfully." };
  } catch (error) {
    return { status: "error", message: databaseMessage(error, "We could not update Attendance. Please try again.") };
  }
}

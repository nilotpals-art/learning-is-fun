"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { loadAttendanceRoster, saveDailyAttendance, updateStudentAttendance } from "@/features/attendance/services/attendance-service";
import type { AttendanceActionResult, LoadAttendanceResult } from "@/features/attendance/types/attendance";
import { attendanceFilterSchema, saveAttendanceSchema, updateAttendanceSchema } from "@/features/attendance/validations/attendance-schema";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

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

function databaseMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : "";
  const code = Object.keys(errorMessages).find((key) => message.includes(key));
  return code ? errorMessages[code] : fallback;
}

async function requireAttendanceAdmin(): Promise<string> {
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) redirect("/unauthorized");
  return profile.instituteId;
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
  await requireAttendanceAdmin();
  try {
    const count = await saveDailyAttendance(parsed.data);
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
  await requireAttendanceAdmin();
  try {
    await updateStudentAttendance(parsed.data);
    revalidatePath("/attendance");
    revalidatePath("/attendance/history");
    revalidatePath("/attendance/reports");
    return { status: "success", message: "Attendance updated successfully." };
  } catch (error) {
    return { status: "error", message: databaseMessage(error, "We could not update Attendance. Please try again.") };
  }
}

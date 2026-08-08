import { z } from "zod";

import { ATTENDANCE_STATUSES } from "@/features/attendance/types/attendance";
import { normalizeUpperText } from "@/lib/validation/normalization";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Select a valid Attendance Date.");
const remarksSchema = z.string().trim().max(250, "Remarks must not exceed 250 characters.").transform(normalizeUpperText);

export const attendanceFilterSchema = z.object({
  attendanceDate: dateSchema,
  academicYearId: z.string().uuid("Select a valid Academic Year."),
  batchId: z.string().uuid("Select a valid Batch."),
});

export const saveAttendanceSchema = attendanceFilterSchema.extend({
  entries: z.array(z.object({
    assignmentId: z.string().uuid("Invalid Student Assignment."),
    studentId: z.string().uuid("Invalid Student."),
    status: z.enum(ATTENDANCE_STATUSES),
    remarks: remarksSchema,
  })).min(1, "There are no Students to save."),
});

export const updateAttendanceSchema = z.object({
  attendanceId: z.string().uuid("Invalid Attendance record."),
  status: z.enum(ATTENDANCE_STATUSES),
  remarks: remarksSchema,
});

export type AttendanceFilterValues = z.infer<typeof attendanceFilterSchema>;
export type SaveAttendanceValues = z.infer<typeof saveAttendanceSchema>;
export type UpdateAttendanceValues = z.infer<typeof updateAttendanceSchema>;

import { z } from "zod";

import { ATTENDANCE_STATUSES } from "@/features/attendance/types/attendance";

const optionalUuid = z.union([z.string().uuid(), z.literal("")]).optional().transform((value) => value || undefined);
const optionalDate = z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]).optional().transform((value) => value || undefined);

const dateRangeFields = {
  dateFrom: optionalDate,
  dateTo: optionalDate,
};

function validRange(data: { dateFrom?: string; dateTo?: string }): boolean {
  return !data.dateFrom || !data.dateTo || data.dateFrom <= data.dateTo;
}

export const attendanceHistoryFilterSchema = z.object({
  ...dateRangeFields,
  academicYearId: optionalUuid,
  batchId: optionalUuid,
  studentId: optionalUuid,
  status: z.union([z.enum(ATTENDANCE_STATUSES), z.literal("")]).optional().transform((value) => value || undefined),
  search: z.string().trim().max(100).optional().transform((value) => value || undefined),
  cursor: z.string().max(500).optional(),
  direction: z.enum(["next", "previous"]).optional().default("next"),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
}).refine(validRange, { message: "Date From must be on or before Date To.", path: ["dateTo"] });

export const attendanceReportFilterSchema = z.object({
  report: z.enum(["student", "batch", "daily", "academic-year", "status"]).optional().default("student"),
  ...dateRangeFields,
  attendanceDate: optionalDate,
  academicYearId: optionalUuid,
  batchId: optionalUuid,
  studentId: optionalUuid,
  status: z.union([z.enum(ATTENDANCE_STATUSES), z.literal("")]).optional().transform((value) => value || undefined),
}).refine(validRange, { message: "Date From must be on or before Date To.", path: ["dateTo"] });

export type AttendanceHistoryFilters = z.infer<typeof attendanceHistoryFilterSchema>;
export type AttendanceReportFilters = z.infer<typeof attendanceReportFilterSchema>;

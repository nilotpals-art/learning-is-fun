import { z } from "zod";
import { normalizeUpperText } from "@/lib/validation/normalization";

import { PROMOTION_TYPES } from "@/features/student-academic-assignments/types/student-academic-assignment";

export const studentAssignmentSchema = z.object({
  studentId: z.string().uuid("Select a valid Student."),
  academicYearId: z.string().uuid("Select a valid Academic Year."),
  schoolId: z.string().uuid("Select a valid School."),
  boardId: z.string().uuid("Select a valid Board."),
  classId: z.string().uuid("Select a valid Class."),
  batchId: z.string().uuid("Select a valid Batch."),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid Effective From date."),
  promotionType: z.enum(PROMOTION_TYPES),
  remarks: z.string().trim().max(1000, "Remarks must not exceed 1000 characters.").transform(normalizeUpperText),
  notifyByWhatsApp: z.boolean(),
});

export type StudentAssignmentValues = z.infer<typeof studentAssignmentSchema>;

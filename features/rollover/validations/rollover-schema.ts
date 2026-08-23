import { z } from "zod";

import {
  ENROLLMENT_BREAK_FEE_TREATMENTS,
  ROLLOVER_JOINING_TYPES,
  ROLLOVER_PARENT_RESPONSES,
} from "@/features/rollover/types/rollover";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Select a valid date.");

export const generateRolloverSchema = z.object({
  sourceYearId: z.string().uuid("Select a valid Source Academic Year."),
  targetYearId: z.string().uuid("Select a valid Target Academic Year."),
});

export const parentResponseSchema = z.object({
  requestId: z.string().uuid("Invalid Rollover Request."),
  parentResponse: z.enum(ROLLOVER_PARENT_RESPONSES, {
    message: "Select a valid continuation option.",
  }),
  joiningType: z.enum(ROLLOVER_JOINING_TYPES, {
    message: "Select a valid joining type.",
  }).nullish(),
  expectedJoiningDate: dateSchema.nullish(),
  selectedBatchId: z.string().uuid("Select a valid Batch.").nullish(),
  notes: z.string().trim().max(500, "Notes must not exceed 500 characters.").nullish(),
}).transform((value) => ({
  ...value,
  // Joining timing is institute-controlled. Never trust or retain a value supplied by the parent client.
  joiningType: value.parentResponse === "continuing" ? ("normal" as const) : null,
  expectedJoiningDate: null,
}));

export const confirmRolloverSchema = z.object({
  requestId: z.string().uuid("Invalid Rollover Request."),
});

export const overrideRolloverSchema = z.object({
  requestId: z.string().uuid("Invalid Rollover Request."),
  newBatchId: z.string().uuid("Select a valid Batch."),
  reason: z.string().trim().min(5, "A reason of at least 5 characters is required.").max(500, "Reason must not exceed 500 characters."),
});

export const finalizeRolloverSchema = z.object({
  requestId: z.string().uuid("Invalid Rollover Request."),
  remarks: z.string().trim().max(500, "Remarks must not exceed 500 characters.").nullish(),
});

export const resolveRolloverSchema = z.object({
  requestId: z.string().uuid("Invalid Rollover Request."),
  adminStatus: z.enum(["rejected", "cancelled"], {
    message: "Select a valid resolution.",
  }),
  notes: z.string().trim().min(5, "Notes of at least 5 characters are required.").max(500, "Notes must not exceed 500 characters."),
});

export const approveRolloverSchema = z.object({
  requestId: z.string().uuid("Invalid Rollover Request."),
  notes: z.string().trim().min(5, "Notes of at least 5 characters are required.").max(500, "Notes must not exceed 500 characters."),
});

export const createBreakSchema = z.object({
  studentId: z.string().uuid("Select a valid Student."),
  academicYearId: z.string().uuid("Select a valid Academic Year."),
  batchId: z.string().uuid("Select a valid Batch."),
  breakFrom: dateSchema,
  breakTo: dateSchema,
  reason: z.string().trim().min(3, "A reason is required.").max(500, "Reason must not exceed 500 characters."),
  feeTreatment: z.enum(ENROLLMENT_BREAK_FEE_TREATMENTS, {
    message: "Select a valid Fee Treatment.",
  }),
  feeTreatmentNotes: z.string().trim().max(500, "Notes must not exceed 500 characters.").nullish(),
});

export const completeBreakSchema = z.object({
  breakId: z.string().uuid("Invalid Break record."),
  actualResumptionDate: dateSchema.nullish(),
});

export const cancelBreakSchema = z.object({
  breakId: z.string().uuid("Invalid Break record."),
  reason: z.string().trim().min(3, "A reason is required.").max(500, "Reason must not exceed 500 characters."),
});

export const setDeadlineSchema = z.object({
  academicYearId: z.string().uuid("Select a valid Academic Year."),
  deadline: dateSchema.nullish(),
});

export type GenerateRolloverValues = z.infer<typeof generateRolloverSchema>;
export type ParentResponseValues = z.infer<typeof parentResponseSchema>;
export type ConfirmRolloverValues = z.infer<typeof confirmRolloverSchema>;
export type OverrideRolloverValues = z.infer<typeof overrideRolloverSchema>;
export type FinalizeRolloverValues = z.infer<typeof finalizeRolloverSchema>;
export type ResolveRolloverValues = z.infer<typeof resolveRolloverSchema>;
export type ApproveRolloverValues = z.infer<typeof approveRolloverSchema>;
export type CreateBreakValues = z.infer<typeof createBreakSchema>;
export type CompleteBreakValues = z.infer<typeof completeBreakSchema>;
export type CancelBreakValues = z.infer<typeof cancelBreakSchema>;
export type SetDeadlineValues = z.infer<typeof setDeadlineSchema>;
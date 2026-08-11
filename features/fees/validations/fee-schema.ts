import { z } from "zod";

import { normalizeUpperText } from "@/lib/validation/normalization";

const id = z.string().uuid();
const money = z.coerce.number().positive().multipleOf(0.01);

export const feeAssignmentSchema = z.object({
  studentId: id,
  academicYearId: id,
  feeHeadId: id,
  amount: money,
  discountType: z.enum(["fixed", "percentage"]).nullable(),
  discountValue: z.coerce.number().min(0).default(0),
  effectiveFrom: z.string().date().nullable(),
  effectiveTo: z.string().date().nullable(),
  installments: z.array(z.object({
    installmentNo: z.coerce.number().int().positive(),
    dueDate: z.string().date(),
    grossAmount: z.coerce.number().nonnegative().multipleOf(0.01),
    discountAmount: z.coerce.number().nonnegative().multipleOf(0.01),
    netAmount: z.coerce.number().nonnegative().multipleOf(0.01),
  })).min(1),
});

export const feePaymentSchema = z.object({
  studentId: id,
  academicYearId: id,
  paymentModeId: id,
  paymentDate: z.string().datetime(),
  referenceNo: z.string().transform(normalizeUpperText).nullable(),
  remarks: z.string().transform(normalizeUpperText).nullable(),
  allocations: z.array(z.object({ dueId: id, amount: money })).min(1),
});

export const reversalSchema = z.object({ paymentId: id, reason: z.string().transform(normalizeUpperText).pipe(z.string().min(3).max(500)) });
export const reminderSchema = z.object({ dueId: id });
export const settingsSchema = z.object({
  whatsappFeeRemindersEnabled: z.boolean(), reminderAfterDueDays: z.coerce.number().int().min(0).max(365),
  repeatEveryDays: z.coerce.number().int().positive().max(365).nullable(), maxRemindersPerDue: z.coerce.number().int().positive().max(50).nullable(),
  whatsappPaymentConfirmationsEnabled: z.boolean(), recipientPreference: z.enum(["parent", "student", "both"]),
  reminderTemplateName: z.string().trim().min(1).max(100), confirmationTemplateName: z.string().trim().min(1).max(100),
});

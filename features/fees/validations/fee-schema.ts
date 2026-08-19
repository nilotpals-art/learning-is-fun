import { z } from "zod";

import { normalizeUpperText } from "@/lib/validation/normalization";

const id = z.string().uuid();
const money = z.coerce.number().positive().multipleOf(0.01);
const optionalText = (max: number) => z.string().trim().max(max).transform((value) => value || null).nullable();
const messageFormat = z.string().trim().min(10).max(2000);

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
  referenceNo: z.string().transform(normalizeUpperText).transform((value) => value || null).nullable(),
  remarks: z.string().transform(normalizeUpperText).transform((value) => value || null).nullable(),
  allocations: z.array(z.object({ dueId: id, amount: money })).min(1),
});

export const reversalSchema = z.object({ paymentId: id, reason: z.string().transform(normalizeUpperText).pipe(z.string().min(3).max(500)) });
export const reminderSchema = z.object({ dueId: id });
export const settingsSchema = z.object({
  whatsappFeeRemindersEnabled: z.boolean(),
  reminderAfterDueDays: z.coerce.number().int().min(0).max(365),
  repeatEveryDays: z.coerce.number().int().positive().max(365).nullable(),
  maxRemindersPerDue: z.coerce.number().int().positive().max(50).nullable(),
  whatsappPaymentConfirmationsEnabled: z.boolean(),
  recipientPreference: z.enum(["parent", "student", "both"]),
  reminderTemplateName: z.string().trim().min(1).max(100),
  confirmationTemplateName: z.string().trim().min(1).max(100),
  reminderMessageFormat: messageFormat,
  confirmationMessageFormat: messageFormat,
  defaultMonthlyDueDay: z.coerce.number().int().min(1).max(28),
  upiId: optionalText(150),
  bankName: optionalText(150),
  bankAccountName: optionalText(150),
  bankAccountNumber: optionalText(80),
  bankIfsc: optionalText(30),
  bankBranch: optionalText(150),
  qrCodeUrl: z.string().trim().max(4000).refine((value) => !value || value.startsWith("https://"), "Use an HTTPS image URL.").transform((value) => value || null).nullable(),
  qrCodePath: optionalText(500),
});

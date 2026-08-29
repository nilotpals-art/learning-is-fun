export const WHATSAPP_TEMPLATE_LANGUAGE = "en" as const;

export const WHATSAPP_TEMPLATES = {
  parentEnrollmentLink: {
    name: "parent_enrollment_link",
    parameters: ["enrollment_url"],
  },
  enrollmentCompleted: {
    name: "enrollment_completed",
    parameters: ["student_name", "admission_no"],
  },
  studentBatchAssignment: {
    name: "student_batch_assignment",
    parameters: ["student_name", "batch_name", "academic_year"],
  },
  feesPaymentConfirmation: {
    name: "fees_payment_confirmation",
    parameters: [
      "amount",
      "student_name",
      "fee_month",
      "fee_head",
      "receipt_no",
      "payment_date",
      "payment_mode",
    ],
  },
  feesPaymentReminder: {
    name: "fees_payment_reminder",
    parameters: [
      "outstanding_amount",
      "student_name",
      "fee_month",
      "fee_head",
      "due_date",
    ],
  },
  feesReceipt: {
    name: "fees_receipt",
    parameters: [
      "student_name",
      "receipt_no",
      "amount",
      "fee_month",
      "fee_head",
      "payment_date",
      "payment_mode",
    ],
  },
  classCancellation: {
    name: "class_cancellation",
    parameters: ["subject", "student_name", "class_date", "class_time", "batch_name"],
  },
  classCancelledRescheduleLater: {
    name: "class_cancelled_reschedule_later",
    parameters: ["subject", "student_name", "class_date", "class_time", "batch_name"],
  },
  classReschedule: {
    name: "class_reschedule",
    parameters: ["subject", "student_name", "batch_name", "new_date", "new_time"],
  },
} as const;

export type WhatsAppTemplateKey = keyof typeof WHATSAPP_TEMPLATES;

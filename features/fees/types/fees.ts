export type FeeActionResult<T = undefined> =
  | { status: "success"; message: string; data?: T }
  | { status: "error"; message: string; fieldErrors?: Record<string, string[]> };

export interface FeeOption { id: string; name: string }
export interface FeeStudent extends FeeOption { admissionNo: string | null }

export interface FeeDue {
  id: string;
  studentId: string;
  studentName: string;
  admissionNo: string | null;
  academicYearId: string;
  academicYearName: string;
  feeHeadName: string;
  dueDate: string;
  netAmount: number;
  outstanding: number;
  status: string;
}

export interface FeePayment {
  id: string;
  studentName: string;
  academicYearName: string;
  paymentModeName: string;
  paymentDate: string;
  amount: number;
  receiptNo: string;
  referenceNo: string | null;
  remarks: string | null;
  status: "posted" | "reversed";
  reversalReason: string | null;
}

export interface FeeMessage {
  id: string;
  studentName: string;
  messageType: string;
  recipientType: string;
  recipientPhone: string;
  status: string;
  attemptCount: number;
  createdAt: string;
  lastErrorCode: string | null;
}

export interface FeeSettings {
  defaultMonthlyDueDay: number;
  whatsappFeeRemindersEnabled: boolean;
  reminderAfterDueDays: number;
  repeatEveryDays: number | null;
  maxRemindersPerDue: number | null;
  whatsappPaymentConfirmationsEnabled: boolean;
  recipientPreference: "parent" | "student" | "both";
  reminderTemplateName: string;
  confirmationTemplateName: string;
}

export interface FeeSummary {
  totalOutstanding: number;
  collectionsToday: number;
  collectionsThisMonth: number;
  studentsOutstanding: number;
  overdueCount: number;
  queuedMessages: number;
}

export const ROLLOVER_PARENT_RESPONSES = [
  "pending",
  "continuing",
  "not_continuing",
  "undecided",
] as const;
export type RolloverParentResponse = (typeof ROLLOVER_PARENT_RESPONSES)[number];

export const ROLLOVER_JOINING_TYPES = ["normal", "delayed"] as const;
export type RolloverJoiningType = (typeof ROLLOVER_JOINING_TYPES)[number];

export const ROLLOVER_ADMIN_STATUSES = [
  "pending",
  "ready",
  "approved",
  "rejected",
  "completed",
  "cancelled",
] as const;
export type RolloverAdminStatus = (typeof ROLLOVER_ADMIN_STATUSES)[number];

export const ENROLLMENT_BREAK_STATUSES = [
  "scheduled",
  "active",
  "completed",
  "cancelled",
] as const;
export type EnrollmentBreakStatus = (typeof ENROLLMENT_BREAK_STATUSES)[number];

export const ENROLLMENT_BREAK_FEE_TREATMENTS = [
  "normal",
  "waived",
  "partial",
  "custom",
] as const;
export type EnrollmentBreakFeeTreatment = (typeof ENROLLMENT_BREAK_FEE_TREATMENTS)[number];

export const ROLLOVER_RESPONSE_LABELS: Record<RolloverParentResponse, string> = {
  pending: "Pending",
  continuing: "Continuing",
  not_continuing: "Not Continuing",
  undecided: "Undecided",
};

export const ROLLOVER_ADMIN_STATUS_LABELS: Record<RolloverAdminStatus, string> = {
  pending: "Pending",
  ready: "Ready",
  approved: "Approved",
  rejected: "Rejected",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const JOINING_TYPE_LABELS: Record<RolloverJoiningType, string> = {
  normal: "Normal joining",
  delayed: "Delayed joining",
};

export const BREAK_FEE_TREATMENT_LABELS: Record<EnrollmentBreakFeeTreatment, string> = {
  normal: "Normal",
  waived: "Waived",
  partial: "Partial",
  custom: "Custom",
};

export interface RolloverWorkspaceRow {
  requestId: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  proposedClassName: string;
  parentResponse: RolloverParentResponse;
  joiningType: RolloverJoiningType | null;
  selectedBatchId: string | null;
  selectedBatchName: string | null;
  adminStatus: RolloverAdminStatus;
  parentLockedAt: string | null;
  parentConfirmedAt: string | null;
  responseDeadline: string | null;
  parentNotes: string | null;
  adminNotes: string | null;
  createdAt: string;
  isLocked: boolean;
}

export interface RolloverBatchOption {
  batchId: string;
  batchName: string;
  branchName: string | null;
  subjectName: string | null;
  capacity: number | null;
  assigned: number;
  reserved: number;
  available: number | null;
  weekdays: number[];
}

export interface RolloverRequestDetail {
  requestId: string;
  instituteId: string;
  branchId: string | null;
  studentId: string;
  studentName: string | null;
  admissionNo: string | null;
  sourceYearId: string;
  sourceYearName: string | null;
  targetYearId: string;
  targetYearName: string | null;
  targetYearStart: string | null;
  proposedClassId: string;
  proposedClassName: string | null;
  proposedBoardId: string;
  proposedBoardName: string | null;
  parentResponse: RolloverParentResponse;
  joiningType: RolloverJoiningType | null;
  expectedJoiningDate: string | null;
  selectedBatchId: string | null;
  selectedBatchName: string | null;
  selectedBatchSubject: string | null;
  parentNotes: string | null;
  parentConfirmedAt: string | null;
  parentLockedAt: string | null;
  adminStatus: RolloverAdminStatus;
  adminNotes: string | null;
  finalizedAssignmentId: string | null;
  finalizedAt: string | null;
  responseDeadline: string | null;
  createdAt: string;
  isLocked: boolean;
  seatsAvailable: number | null;
}

export interface ParentRolloverRequest {
  requestId: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  sourceYearName: string;
  targetYearName: string;
  targetYearStart: string | null;
  proposedClassName: string;
  parentResponse: RolloverParentResponse;
  joiningType: RolloverJoiningType | null;
  expectedJoiningDate: string | null;
  selectedBatchId: string | null;
  selectedBatchName: string | null;
  selectedBatchSubject: string | null;
  adminStatus: RolloverAdminStatus;
  parentLockedAt: string | null;
  parentConfirmedAt: string | null;
  responseDeadline: string | null;
  parentNotes: string | null;
  adminNotes: string | null;
  createdAt: string;
  isLocked: boolean;
}

export interface ParentEnrollmentBreak {
  breakId: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  yearName: string;
  batchName: string;
  breakFrom: string;
  breakTo: string;
  status: EnrollmentBreakStatus;
  reason: string | null;
  feeTreatment: EnrollmentBreakFeeTreatment;
  actualResumptionDate: string | null;
  createdAt: string;
}

export interface AdminEnrollmentBreak {
  breakId: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  yearName: string;
  batchName: string;
  breakFrom: string;
  breakTo: string;
  status: EnrollmentBreakStatus;
  reason: string | null;
  feeTreatment: EnrollmentBreakFeeTreatment;
  feeTreatmentNotes: string | null;
  source: "manual" | "rollover";
  rolloverRequestId: string | null;
  actualResumptionDate: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelledReason: string | null;
  createdAt: string;
}

export type RolloverActionResult =
  | { status: "success"; message: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string[] | undefined> };

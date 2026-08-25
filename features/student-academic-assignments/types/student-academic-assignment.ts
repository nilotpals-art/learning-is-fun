export const ASSIGNMENT_STATUSES = ["Current", "Completed"] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const PROMOTION_TYPES = [
  "New Admission",
  "Promoted",
  "Batch Transfer",
  "School Transfer",
  "Readmission",
] as const;
export type PromotionType = (typeof PROMOTION_TYPES)[number];

export interface AssignmentOption { id: string; label: string }
export interface AssignmentAcademicYearOption extends AssignmentOption { isCurrent: boolean }
export interface AssignmentBatchOption extends AssignmentOption {
  boardId: string;
  classId: string;
  academicYearId: string | null;
}

export interface StudentAssignment {
  id: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  academicYearId: string;
  academicYearName: string;
  schoolId: string;
  schoolName: string;
  boardId: string;
  boardName: string;
  classId: string;
  className: string;
  batchId: string;
  batchName: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: AssignmentStatus;
  promotionType: PromotionType;
  remarks: string | null;
  createdAt: string;
}

export interface AssignmentFormOptions {
  students: AssignmentOption[];
  academicYears: AssignmentAcademicYearOption[];
  schools: AssignmentOption[];
  boards: AssignmentOption[];
  classes: AssignmentOption[];
  batches: AssignmentBatchOption[];
}

export type AssignmentActionResult =
  | { status: "success"; message: string; assignmentId: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string[] | undefined> };

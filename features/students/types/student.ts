export const STUDENT_STATUSES = ["Active", "Inactive", "Completed", "Left"] as const;
export const STUDENT_GENDERS = ["Male", "Female", "Other"] as const;
export const PARENT_RELATIONSHIPS = ["Father", "Mother", "Guardian"] as const;

export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export interface StudentRecord {
  id: string;
  admissionNumber: string;
  name: string;
  motherName: string | null;
  dateOfBirth: string;
  gender: string;
  mobile: string;
  email: string;
  schoolName: string | null;
  address: string | null;
  admissionDate: string;
  status: StudentStatus;
  comments: string | null;
  parentId: string;
  parentName: string;
  parentMobile: string;
  parentEmail: string;
  relationship: string;
}

export interface StudentAcademicYearOption {
  id: string;
  name: string;
  isCurrent: boolean;
}

export interface StudentClassOption { id: string; name: string }

export interface ParentConflictDetails {
  parentId: string;
  existingName: string;
  existingMobile: string;
  submittedName: string;
  submittedMobile: string;
  linkedChildCount: number;
}

export type StudentFieldErrors = Partial<Record<string, string[]>>;

export type StudentActionResult =
  | { status: "success"; message: string; admissionNumber?: string; feesWarning?: string }
  | {
      status: "parent_conflict";
      message: string;
      conflict: ParentConflictDetails;
    }
  | {
      status: "error";
      message: string;
      code?: "manual_reconciliation_required" | "provisioning_failed";
      fieldErrors?: StudentFieldErrors;
    };

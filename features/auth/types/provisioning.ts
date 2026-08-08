export type ProvisioningConflictCode =
  | "auth_email_conflict"
  | "domain_already_linked"
  | "email_mismatch"
  | "identity_integrity_conflict"
  | "profile_conflict";

export type IdentityProvisioningResult =
  | { status: "created"; message: string }
  | { status: "reused"; message: string }
  | {
      status: "conflict";
      code: ProvisioningConflictCode;
      message: string;
    }
  | {
      status: "error";
      code:
        | "configuration_error"
        | "manual_reconciliation_required"
        | "not_found"
        | "provisioning_failed";
      message: string;
    };

export type ParentReuseAssessment =
  | { status: "not_found" }
  | { status: "reuse"; parentId: string }
  | {
      status: "conflict";
      parentId: string;
      comparison: {
        existingName: string;
        existingMobile: string;
        submittedName: string;
        submittedMobile: string;
        linkedChildCount: number;
      };
    };

export interface ProvisionStudentIdentityInput {
  studentId: string;
  email: string;
}

export interface ProvisionParentIdentityInput {
  parentId: string;
  email: string;
  studentId?: string;
  relationship?: string;
}

export interface AssessParentReuseInput {
  name: string;
  mobile: string;
  email: string;
}

export interface FeeHead {
  id: string;
  name: string;
  code: string;
  category: string;
  displayOrder: number;
  isActive: boolean;
  assigned: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export const RECOMMENDED_FEE_HEADS = [
  { name: "Tuition Fee", code: "TUI", category: "Academic", displayOrder: 1, isActive: true },
  { name: "Examination Fee", code: "EXM", category: "Examination", displayOrder: 2, isActive: true },
  { name: "Activity Fee", code: "ACT", category: "Academic", displayOrder: 3, isActive: true },
  { name: "Security Deposit", code: "SEC", category: "Security Deposit", displayOrder: 4, isActive: true },
  { name: "Miscellaneous Fee", code: "MSC", category: "Miscellaneous", displayOrder: 5, isActive: true },
] as const;

export type FeeHeadSetupStatus = "existing" | "missing" | "conflict";

export interface FeeHeadSetupItem {
  name: string;
  code: string;
  category: string;
  displayOrder: number;
  status: FeeHeadSetupStatus;
  conflictMessages: string[];
}

export interface FeeHeadSetupState {
  complete: boolean;
  items: FeeHeadSetupItem[];
  conflicts: string[];
  missingCount: number;
}

export type FeeHeadFieldErrors = Partial<
  Record<
    | "name"
    | "code"
    | "categoryChoice"
    | "customCategory"
    | "displayOrder"
    | "isActive",
    string[]
  >
>;

export type FeeHeadActionResult =
  | { status: "success"; message: string }
  | {
      status: "error";
      message: string;
      fieldErrors?: FeeHeadFieldErrors;
    };

export interface PaymentMode {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const RECOMMENDED_PAYMENT_MODES = ["Cash", "UPI", "Bank Transfer", "Cheque"] as const;

export interface PaymentModeSetupItem {
  name: string;
  exists: boolean;
}

export interface PaymentModeSetupState {
  complete: boolean;
  missingCount: number;
  items: PaymentModeSetupItem[];
}

export type PaymentModeFieldErrors = Partial<Record<"name" | "isActive", string[]>>;

export type PaymentModeActionResult =
  | { status: "success"; message: string }
  | { status: "error"; message: string; fieldErrors?: PaymentModeFieldErrors };

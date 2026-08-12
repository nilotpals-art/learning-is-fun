import { ROLE } from "@/lib/auth/roles";

export const SUPPORTED_ROLES = Object.values(ROLE);

export type SupportedRole = (typeof SUPPORTED_ROLES)[number];

export interface AuthProfile {
  id: string;
  userId: string | null;
  email: string | null;
  name: string;
  role: string | null;
  isActive: boolean;
  instituteId: string | null;
  branchId: string | null;
  instituteName: string | null;
  instituteShortName: string | null;
  instituteLogoUrl: string | null;
}

export type OtpRequestResult =
  | { status: "otp_sent"; message: string }
  | { status: "unauthorized"; message: string }
  | { status: "inactive"; message: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string[]> };

export type AuthActionResult =
  | { status: "invalid"; message: string; fieldErrors?: Record<string, string[]> }
  | { status: "error"; message: string }
  | { status: "redirect"; destination: string };

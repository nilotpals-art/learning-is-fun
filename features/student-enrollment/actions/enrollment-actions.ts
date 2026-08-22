"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { findFeeStructure } from "@/features/fees/services/fee-structure-service";
import {
  createEnrollmentInvite,
  provisionEnrollmentPortalIdentities,
  requestEnrollmentOtp,
  submitEnrollment,
  verifyEnrollmentOtp,
  type EnrollmentPurpose,
} from "@/features/student-enrollment/services/enrollment-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

const mobileSchema = z.string().trim().regex(/^[6-9][0-9]{9}$/, "Enter a valid 10-digit Indian mobile number.");
const emailSchema = z.string().trim().email().transform((value) => value.toLowerCase());
const purposeSchema = z.enum(["STUDENT", "PARENT"]);
const optionalEmailSchema = z.union([emailSchema, z.literal("")]).transform((value) => value || null);

export async function createEnrollmentLinkAction(input: unknown) {
  const parsed = z.object({
    parentMobile: mobileSchema,
    academicYearId: z.string().uuid(),
    classId: z.string().uuid(),
    expiryDays: z.coerce.number().int().min(1).max(30).default(7),
  }).safeParse(input);
  if (!parsed.success) return { status: "error" as const, message: parsed.error.issues[0]?.message ?? "Invalid enrollment details." };

  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) return { status: "error" as const, message: "Institute is unavailable." };
  const feeStructure = await findFeeStructure(profile, parsed.data.academicYearId, parsed.data.classId);
  if (!feeStructure) return { status: "error" as const, message: "Configure an active fee structure for this Academic Year and Class before creating the link." };

  const expiresAt = new Date(Date.now() + parsed.data.expiryDays * 24 * 60 * 60 * 1000).toISOString();
  const token = await createEnrollmentInvite({
    instituteId: profile.instituteId,
    createdBy: profile.id,
    parentMobile: parsed.data.parentMobile,
    academicYearId: parsed.data.academicYearId,
    classId: parsed.data.classId,
    feeStructureId: feeStructure.id,
    expiresAt,
  });

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const origin = configuredOrigin ?? (host ? `${proto}://${host}` : "");
  revalidatePath("/students/enrollment-links");
  return { status: "success" as const, url: `${origin}/enroll/${token}`, expiresAt };
}

export async function requestEnrollmentOtpAction(token: string, purposeInput: unknown, emailInput: unknown) {
  const purpose = purposeSchema.safeParse(purposeInput);
  const email = emailSchema.safeParse(emailInput);
  if (!purpose.success || !email.success) return { status: "error" as const, message: "Enter a valid email address." };
  try {
    await requestEnrollmentOtp(token, purpose.data as EnrollmentPurpose, email.data);
    return { status: "success" as const, message: "A 6-digit OTP has been sent to the email address." };
  } catch (error) {
    return { status: "error" as const, message: error instanceof Error ? error.message : "Could not send OTP." };
  }
}

export async function verifyEnrollmentOtpAction(token: string, purposeInput: unknown, emailInput: unknown, codeInput: unknown) {
  const purpose = purposeSchema.safeParse(purposeInput);
  const email = emailSchema.safeParse(emailInput);
  const code = z.string().trim().regex(/^\d{6}$/).safeParse(codeInput);
  if (!purpose.success || !email.success || !code.success) return { status: "error" as const, message: "Enter the 6-digit OTP." };
  try {
    const verifiedEmail = await verifyEnrollmentOtp(token, purpose.data as EnrollmentPurpose, email.data, code.data);
    return { status: "success" as const, message: "Email verified.", email: verifiedEmail };
  } catch (error) {
    return { status: "error" as const, message: error instanceof Error ? error.message : "OTP verification failed." };
  }
}

export async function submitEnrollmentAction(token: string, input: unknown) {
  const schema = z.object({
    name: z.string().trim().min(1),
    motherName: z.string().trim().optional().default(""),
    gender: z.enum(["Male", "Female", "Other"]),
    dateOfBirth: z.string().refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00`)) && new Date(`${value}T00:00:00`) <= new Date(), "Enter a valid Date of Birth."),
    studentMobile: mobileSchema,
    studentEmail: optionalEmailSchema,
    studentNoEmail: z.boolean(),
    address: z.string().trim().optional().default(""),
    parentName: z.string().trim().min(1),
    relationship: z.enum(["Father", "Mother", "Guardian"]),
    parentEmail: optionalEmailSchema,
    parentNoEmail: z.boolean(),
    rulesAccepted: z.literal(true),
  }).superRefine((value, ctx) => {
    if (value.studentNoEmail && value.studentEmail) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["studentEmail"], message: "Clear Student Email when No email is selected." });
    if (!value.studentNoEmail && !value.studentEmail) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["studentEmail"], message: "Enter Student Email or select No email." });
    if (value.parentNoEmail && value.parentEmail) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["parentEmail"], message: "Clear Parent Email when No email is selected." });
    if (!value.parentNoEmail && !value.parentEmail) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["parentEmail"], message: "Enter Parent Email or select No email." });
    if (value.studentNoEmail && value.parentNoEmail) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["parentEmail"], message: "At least Student Email or Parent Email is required." });
    if (value.studentEmail && value.parentEmail && value.studentEmail === value.parentEmail) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["parentEmail"], message: "Student and Parent Email must be different." });
  });

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { status: "error" as const, message: parsed.error.issues[0]?.message ?? "Please complete all required fields." };

  try {
    const result = await submitEnrollment(token, parsed.data);
    try {
      await provisionEnrollmentPortalIdentities({
        studentId: result.student_id,
        parentId: result.parent_id,
        studentEmail: parsed.data.studentEmail,
        parentEmail: parsed.data.parentEmail,
      });
    } catch (identityError) {
      console.error("Parent enrollment portal provisioning failed", {
        studentId: result.student_id,
        parentId: result.parent_id,
        error: identityError instanceof Error ? identityError.message : "unknown",
      });
    }
    revalidatePath("/students");
    revalidatePath("/students/enrollment-links");
    revalidatePath("/fees/student-fees");
    return { status: "success" as const, admissionNumber: result.admission_no, enrollmentDate: result.enrollment_date };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Enrollment could not be submitted.";
    if (message.includes("PARENT_ENROLLMENT_PARENT_CONFLICT")) return { status: "error" as const, message: "These parent details conflict with an existing Parent record. Please contact Learning Is Fun." };
    if (message.includes("PARENT_ENROLLMENT_EMAIL_REQUIRED")) return { status: "error" as const, message: "At least Student Email or Parent Email is required." };
    if (message.includes("PARENT_ENROLLMENT_EMAILS_MUST_DIFFER")) return { status: "error" as const, message: "Student and Parent Email must be different." };
    if (message.includes("PARENT_ENROLLMENT_STUDENT_EMAIL_UNVERIFIED") || message.includes("PARENT_ENROLLMENT_PARENT_EMAIL_UNVERIFIED")) return { status: "error" as const, message: "Every email provided must be OTP verified before submission." };
    if (message.includes("PARENT_ENROLLMENT_EXPIRED") || message.includes("PARENT_ENROLLMENT_INVALID")) return { status: "error" as const, message: "This enrollment link is no longer active." };
    if (message.includes("PARENT_ENROLLMENT_STUDENT_EMAIL_EXISTS")) return { status: "error" as const, message: "A student account already uses this email address." };
    return { status: "error" as const, message: "Enrollment could not be submitted. Please contact Learning Is Fun." };
  }
}

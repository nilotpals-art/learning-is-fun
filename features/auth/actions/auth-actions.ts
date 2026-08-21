"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  findAuthorizedProfileByEmail,
  getCurrentProfile,
  getRoleDestination,
} from "@/lib/auth/services/auth-service";
import { createClient } from "@/lib/supabase/server";
import type {
  AuthActionResult,
  OtpRequestResult,
} from "@/features/auth/types/auth";
import { EMAIL_OTP_LENGTH } from "@/features/auth/constants/auth";
import {
  loginSchema,
  otpTokenSchema,
} from "@/features/auth/validations/login-schema";

const AUTH_EMAIL_COOKIE = "lif_auth_email";
const OTP_COOKIE_MAX_AGE_SECONDS = 10 * 60;
const OTP_SENT_MESSAGE = "A verification code has been sent to your email.";
const UNAUTHORIZED_MESSAGE =
  "You are not authorised to log in. Please contact the institute administrator.";
const INACTIVE_MESSAGE =
  "Your account is inactive. Please contact the institute administrator.";
const OTP_ERROR_MESSAGE =
  "We could not send a verification code. Please try again.";
const SESSION_SECURITY_ERROR_MESSAGE =
  "We could not secure this login session. Please try again.";

function logOtpRequestRejection(reason: string): void {
  console.warn("Authentication OTP request rejected", { reason });
}

async function setPendingEmail(email: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_EMAIL_COOKIE, email, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: OTP_COOKIE_MAX_AGE_SECONDS,
  });
}

async function getPendingEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_EMAIL_COOKIE)?.value ?? null;
}

async function clearPendingEmail(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_EMAIL_COOKIE);
}

export async function clearPendingOtp(): Promise<void> {
  await clearPendingEmail();
}

export async function requestOtp(input: unknown): Promise<OtpRequestResult> {
  await clearPendingEmail();

  const parsed = loginSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the email address.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { email } = parsed.data;

  try {
    const profile = await findAuthorizedProfileByEmail(email);

    if (!profile) {
      logOtpRequestRejection("profile_not_found");
      return { status: "unauthorized", message: UNAUTHORIZED_MESSAGE };
    }

    if (!profile.isActive) {
      logOtpRequestRejection("profile_inactive");
      return { status: "inactive", message: INACTIVE_MESSAGE };
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    if (error) {
      logOtpRequestRejection(`supabase_${error.code ?? "unknown"}`);
      return { status: "error", message: OTP_ERROR_MESSAGE };
    }

    await setPendingEmail(email);
    return { status: "otp_sent", message: OTP_SENT_MESSAGE };
  } catch {
    logOtpRequestRejection("network_or_unexpected_error");
    return { status: "error", message: OTP_ERROR_MESSAGE };
  }
}

export async function resendOtp(): Promise<OtpRequestResult> {
  const email = await getPendingEmail();

  if (!email) {
    return {
      status: "error",
      message: "Your verification request expired. Please enter your email again.",
    };
  }

  return requestOtp({ email });
}

export async function verifyOtp(input: unknown): Promise<AuthActionResult> {
  const parsed = otpTokenSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "invalid",
      message: `Enter the ${EMAIL_OTP_LENGTH}-digit verification code.`,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const email = await getPendingEmail();
  if (!email) {
    return {
      status: "error",
      message: "This code has expired. Request a new verification code.",
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: parsed.data.token,
      type: "email",
    });

    if (error) {
      const expired = error.message.toLowerCase().includes("expired");
      return {
        status: "error",
        message: expired
          ? "This code has expired. Request a new verification code."
          : "That verification code is invalid. Please try again.",
      };
    }

    const profile = await getCurrentProfile();

    if (!profile) {
      await supabase.auth.signOut({ scope: "local" });
      await clearPendingEmail();
      return { status: "redirect", destination: "/unauthorized" };
    }

    if (!profile.isActive) {
      await supabase.auth.signOut({ scope: "local" });
      await clearPendingEmail();
      return { status: "redirect", destination: "/inactive" };
    }

    const { error: sessionError } = await supabase.auth.signOut({ scope: "others" });

    if (sessionError) {
      console.error("Authentication single-session enforcement failed", {
        code: sessionError.code ?? "unknown",
      });
      await supabase.auth.signOut({ scope: "local" });
      await clearPendingEmail();
      return { status: "error", message: SESSION_SECURITY_ERROR_MESSAGE };
    }

    await clearPendingEmail();
    return {
      status: "redirect",
      destination: getRoleDestination(profile.role),
    };
  } catch {
    return {
      status: "error",
      message: "We could not verify the code. Check your connection and try again.",
    };
  }
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

export async function logoutAndRedirect(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

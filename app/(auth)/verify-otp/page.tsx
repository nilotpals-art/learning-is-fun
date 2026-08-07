import type { Metadata } from "next";

import { AuthCard } from "@/features/auth/components/auth-card";
import { OtpForm } from "@/features/auth/components/otp-form";
import { EMAIL_OTP_LENGTH } from "@/features/auth/constants/auth";

export const metadata: Metadata = { title: "Verify email" };

export default function VerifyOtpPage() {
  return (
    <AuthCard
      title="Check your email"
      description={`If the address is authorized, enter the ${EMAIL_OTP_LENGTH}-digit code sent to it.`}
    >
      <OtpForm />
    </AuthCard>
  );
}

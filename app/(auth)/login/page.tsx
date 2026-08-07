import type { Metadata } from "next";

import { AuthCard } from "@/features/auth/components/auth-card";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthCard
      title="Learning Is Fun"
      description="Enter your authorized email address to receive a verification code."
    >
      <LoginForm />
    </AuthCard>
  );
}

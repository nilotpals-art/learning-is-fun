import type { Metadata } from "next";

import { AuthCard } from "@/features/auth/components/auth-card";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Sign in | Learning Is Fun" };

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      description="Sign in with your authorized email address to continue to the Learning Is Fun portal."
    >
      <LoginForm />
    </AuthCard>
  );
}

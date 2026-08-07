import type { Metadata } from "next";
import { AuthCard } from "@/features/auth/components/auth-card";
import { LogoutButton } from "@/features/auth/components/logout-button";

export const metadata: Metadata = { title: "Unauthorized" };

export default function UnauthorizedPage() {
  return (
    <AuthCard
      title="Access unavailable"
      description="Your account does not have access to a dashboard. Contact an administrator if you believe this is incorrect."
    >
      <div className="flex justify-center">
        <LogoutButton />
      </div>
    </AuthCard>
  );
}

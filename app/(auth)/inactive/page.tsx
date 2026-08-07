import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { AuthCard } from "@/features/auth/components/auth-card";

export const metadata: Metadata = { title: "Inactive account" };

export default function InactivePage() {
  return (
    <AuthCard
      title="Account inactive"
      description="This account is inactive. Contact an administrator to restore access."
    >
      <Button className="w-full" render={<Link href="/login" />}>
        Return to sign in
      </Button>
    </AuthCard>
  );
}

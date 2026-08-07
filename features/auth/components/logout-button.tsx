"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { logout } from "@/features/auth/actions/auth-actions";
import { cn } from "@/lib/utils";

interface LogoutButtonProps {
  className?: string;
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
}

export function LogoutButton({
  className,
  label = "Sign out",
  variant = "outline",
}: LogoutButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      await logout();
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant={variant}
      className={cn(className)}
      onClick={handleLogout}
      disabled={isPending}
    >
      <LogOut aria-hidden="true" />
      {isPending ? "Signing out…" : label}
    </Button>
  );
}

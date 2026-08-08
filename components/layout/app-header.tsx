"use client";

import { Bell, ChevronDown, GitBranch, LogOut, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/features/auth/actions/auth-actions";
import type { NavigationItem } from "@/lib/navigation";
import { MobileNavigation } from "@/components/layout/mobile-navigation";

interface AppHeaderProps {
  instituteName: string;
  navigationItems: readonly NavigationItem[];
  user: {
    name: string;
    email: string | null;
    role: string;
  };
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
}

export function AppHeader({
  instituteName,
  navigationItems,
  user,
}: AppHeaderProps) {
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
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-indigo-100/80 bg-white/85 px-4 shadow-sm backdrop-blur-xl sm:px-6">
      <MobileNavigation
        instituteName={instituteName}
        items={navigationItems}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold sm:text-base">{instituteName}</p>
        <p className="hidden text-xs text-muted-foreground sm:block">Learning Is Fun ERP</p>
      </div>

      <Button
        type="button"
        variant="outline"
        className="hidden gap-2 md:inline-flex"
        disabled
        aria-label="Branch selector — coming soon"
      >
        <GitBranch aria-hidden="true" />
        Branch
        <Badge variant="secondary" className="text-[0.625rem]">Soon</Badge>
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Notifications — coming soon"
        title="Notifications — coming soon"
      >
        <Bell aria-hidden="true" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" className="h-auto gap-2 rounded-full p-1 pr-2" />
          }
        >
          <Avatar>
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-36 truncate text-sm sm:inline">{user.name}</span>
          <ChevronDown className="hidden size-3.5 sm:block" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>
            <span className="block truncate font-medium text-foreground">{user.name}</span>
            <span className="mt-0.5 block truncate">{user.email ?? "Authenticated user"}</span>
            <Badge variant="secondary" className="mt-2">{user.role}</Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <UserRound aria-hidden="true" />
            Profile
            <span className="ml-auto text-xs text-muted-foreground">Soon</span>
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={handleLogout} disabled={isPending}>
            <LogOut aria-hidden="true" />
            {isPending ? "Signing out…" : "Logout"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

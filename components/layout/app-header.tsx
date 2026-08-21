"use client";

import { Bell, ChevronDown, GitBranch, LogOut, UserRound } from "lucide-react";
import { useTransition } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { logoutAndRedirect } from "@/features/auth/actions/auth-actions";
import type { NavigationItem } from "@/lib/navigation";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { cn } from "@/lib/utils";

interface AppHeaderProps { instituteName: string; navigationItems: readonly NavigationItem[]; user: { name: string; email: string | null; role: string }; parentTheme?: boolean; adminTheme?: boolean; }
function getInitials(name: string): string { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U"; }

export function AppHeader({ instituteName, navigationItems, user, parentTheme = false, adminTheme = false }: AppHeaderProps) {
  const [isPending, startTransition] = useTransition();
  function handleLogout() { startTransition(async () => { await logoutAndRedirect(); }); }
  return <header className={cn("sticky top-0 z-40 flex h-24 items-center gap-3 border-b px-4 shadow-sm backdrop-blur-xl sm:px-6", parentTheme ? "border-slate-200/80 bg-white/90" : adminTheme ? "border-slate-200/80 bg-white/90" : "border-indigo-100/80 bg-white/85")}>
    <MobileNavigation instituteName={instituteName} items={navigationItems} parentTheme={parentTheme} />
    <div className="min-w-0 flex-1">
      {parentTheme ? <div><p className="truncate bg-gradient-to-r from-blue-950 via-blue-800 to-teal-700 bg-clip-text text-xl font-black tracking-tight text-transparent sm:text-2xl lg:text-3xl">Learning Is Fun!!!</p><p className="truncate text-xs font-semibold text-slate-500 sm:text-sm"><span className="text-teal-700">{instituteName}</span> · Parent Portal</p></div> : adminTheme ? <div><p className="truncate bg-gradient-to-r from-slate-950 via-blue-900 to-cyan-700 bg-clip-text text-2xl font-black tracking-tight text-transparent sm:text-3xl lg:text-4xl">Learning Is Fun!!!</p><p className="truncate text-xs font-bold text-slate-500 sm:text-sm"><span className="text-cyan-700">English Remedial Classes</span> · {instituteName} · Administration</p></div> : <><p className="truncate text-sm font-semibold sm:text-base">{instituteName}</p><p className="hidden text-xs text-muted-foreground sm:block">Learning Is Fun ERP</p></>}
    </div>
    <Button type="button" variant="outline" className="hidden gap-2 md:inline-flex" disabled aria-label="Branch selector — coming soon"><GitBranch aria-hidden="true" />Branch<Badge variant="secondary" className="text-[0.625rem]">Soon</Badge></Button>
    <Button type="button" variant="ghost" size="icon" aria-label="Notifications — coming soon" title="Notifications — coming soon"><Bell aria-hidden="true" /></Button>
    <DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" className="h-auto gap-2 rounded-full p-1 pr-2" />}><Avatar><AvatarFallback className={parentTheme ? "bg-gradient-to-br from-blue-950 to-teal-700 font-bold text-white" : adminTheme ? "bg-gradient-to-br from-slate-950 to-cyan-700 font-bold text-white" : undefined}>{getInitials(user.name)}</AvatarFallback></Avatar><span className="hidden max-w-36 truncate text-sm sm:inline">{user.name}</span><ChevronDown className="hidden size-3.5 sm:block" aria-hidden="true" /></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-64"><DropdownMenuLabel><span className="block truncate font-medium text-foreground">{user.name}</span><span className="mt-0.5 block truncate">{user.email ?? "Authenticated user"}</span><Badge variant="secondary" className="mt-2">{user.role}</Badge></DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem disabled><UserRound aria-hidden="true" />Profile<span className="ml-auto text-xs text-muted-foreground">Use sidebar</span></DropdownMenuItem><DropdownMenuItem variant="destructive" onClick={handleLogout} disabled={isPending}><LogOut aria-hidden="true" />{isPending ? "Signing out…" : "Logout"}</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
  </header>;
}

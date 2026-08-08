import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import type { ModuleTheme } from "@/lib/module-theme";
import { moduleThemes } from "@/lib/module-theme";
import { cn } from "@/lib/utils";

export function FormSection({ title, icon: Icon, theme, children }: { title: string; icon: LucideIcon; theme: ModuleTheme; children: ReactNode }) {
  const accent = moduleThemes[theme];
  return <section className={cn("space-y-4 rounded-2xl border border-l-4 bg-card/90 p-4 shadow-sm sm:p-5", accent.border)}><div className="flex items-center gap-3"><span className={cn("flex size-9 items-center justify-center rounded-xl", accent.soft)}><Icon className="size-4.5" aria-hidden="true" /></span><h3 className="text-base font-bold tracking-tight">{title}</h3></div>{children}</section>;
}

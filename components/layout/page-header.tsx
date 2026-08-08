import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import type { ModuleTheme } from "@/lib/module-theme";
import { moduleThemes } from "@/lib/module-theme";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, icon: Icon, theme, action, badge, eyebrow }: { title: string; description: string; icon: LucideIcon; theme: ModuleTheme; action?: ReactNode; badge?: ReactNode; eyebrow?: string }) {
  const accent = moduleThemes[theme];
  return <section className={cn("relative isolate overflow-hidden rounded-3xl bg-gradient-to-br p-6 text-white shadow-lg shadow-slate-900/10 sm:p-8", accent.header)}><div className="absolute -right-14 -top-20 -z-10 size-56 rounded-full bg-white/10 blur-2xl" aria-hidden="true" /><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-start gap-4"><span className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl shadow-inner ring-1 ring-white/20 sm:size-14", accent.icon)}><Icon className="size-6 sm:size-7" aria-hidden="true" /></span><div className="min-w-0">{eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">{eyebrow}</p> : null}<div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>{badge}</div><p className="mt-2 max-w-2xl text-sm leading-6 text-white/80 sm:text-base">{description}</p></div></div>{action ? <div className="shrink-0 [&_button]:bg-white [&_button]:text-slate-900 [&_button]:shadow-md [&_button:hover]:bg-white/90">{action}</div> : null}</div></section>;
}

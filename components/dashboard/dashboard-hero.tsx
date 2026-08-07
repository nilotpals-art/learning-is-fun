import { BookOpenCheck, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";

interface DashboardHeroProps {
  greeting: string;
  userName: string;
  role: string;
  instituteName: string;
}

export function DashboardHero({
  greeting,
  userName,
  role,
  instituteName,
}: DashboardHeroProps) {
  return (
    <section className="relative isolate overflow-hidden rounded-3xl border bg-gradient-to-br from-blue-50 via-background to-amber-50 p-6 shadow-sm dark:from-blue-950/35 dark:via-background dark:to-amber-950/20 sm:p-8">
      <div
        className="absolute -right-16 -top-20 -z-10 size-56 rounded-full bg-blue-200/35 blur-3xl dark:bg-blue-500/10"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-24 right-1/3 -z-10 size-48 rounded-full bg-amber-200/35 blur-3xl dark:bg-amber-500/10"
        aria-hidden="true"
      />
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="gap-1.5 bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
              <Sparkles className="size-3" aria-hidden="true" />
              {role}
            </Badge>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            {greeting}, {userName}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Here’s what’s happening at {instituteName} today. Keep learning,
            growing, and making every class count.
          </p>
        </div>
        <div className="flex size-20 shrink-0 items-center justify-center rounded-3xl bg-white/75 text-blue-700 shadow-sm ring-1 ring-blue-100 backdrop-blur dark:bg-blue-950/50 dark:text-blue-200 dark:ring-blue-900 sm:size-24">
          <BookOpenCheck className="size-9 sm:size-11" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

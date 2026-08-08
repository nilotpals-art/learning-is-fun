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
    <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-800 to-violet-700 p-6 text-white shadow-xl shadow-indigo-950/15 sm:p-8">
      <div
        className="absolute -right-16 -top-20 -z-10 size-56 rounded-full bg-cyan-300/20 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-24 right-1/3 -z-10 size-48 rounded-full bg-fuchsia-300/20 blur-3xl"
        aria-hidden="true"
      />
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="gap-1.5 border-white/15 bg-white/15 text-white backdrop-blur">
              <Sparkles className="size-3" aria-hidden="true" />
              {role}
            </Badge>
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
            {greeting}, {userName}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
            Here’s what’s happening at {instituteName} today. Keep learning,
            growing, and making every class count.
          </p>
        </div>
        <div className="flex size-20 shrink-0 items-center justify-center rounded-3xl bg-white/15 text-white shadow-lg ring-1 ring-white/20 backdrop-blur sm:size-24">
          <BookOpenCheck className="size-9 sm:size-11" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

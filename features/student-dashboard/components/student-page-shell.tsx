import type { ReactNode } from "react";
import { BookOpen, GraduationCap, Sparkles } from "lucide-react";

export function StudentPageShell({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="relative -m-4 min-h-[calc(100vh-4rem)] overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(168,85,247,0.16),_transparent_26%),linear-gradient(135deg,_#f8fbff_0%,_#f5f3ff_48%,_#fff7ed_100%)] p-4 sm:-m-6 sm:p-6 dark:bg-[linear-gradient(135deg,#0f172a,#172554,#3b0764)]">
      <div className="pointer-events-none absolute -left-10 top-24 size-40 rounded-full bg-cyan-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 top-10 size-48 rounded-full bg-fuchsia-200/30 blur-3xl" />
      <div className="relative space-y-6">
        <header className="overflow-hidden rounded-[2rem] border border-white/40 bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-700 p-6 text-white shadow-2xl shadow-indigo-200/40 sm:p-8 dark:shadow-none">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.22em] text-cyan-100"><GraduationCap className="size-5" /> Learning Is Fun!!!</div>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
              <p className="mt-2 max-w-2xl text-blue-100">{description}</p>
            </div>
            <div className="hidden items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur sm:flex"><BookOpen className="size-7 text-amber-300" /><div><p className="text-sm font-bold">Read · Learn · Grow</p><p className="text-xs text-blue-100">English Remedial Classes</p></div><Sparkles className="size-5 text-amber-300" /></div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

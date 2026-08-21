import type { ReactNode } from "react";
import {
  BookOpen,
  GraduationCap,
  Library,
  PencilLine,
  Sparkles,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AuthCardProps {
  title: string;
  description: string;
  children?: ReactNode;
}

const learningHighlights = [
  { icon: BookOpen, text: "English learning made engaging" },
  { icon: PencilLine, text: "Practice, progress and confidence" },
  { icon: Library, text: "One portal for students and parents" },
] as const;

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.35),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.28),_transparent_35%),linear-gradient(135deg,#082f49_0%,#0f172a_45%,#172554_100%)]" />
      <div className="absolute -left-20 top-16 size-72 rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="absolute -right-24 bottom-10 size-80 rounded-full bg-emerald-300/10 blur-3xl" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-10 lg:py-10">
        <section className="hidden text-white lg:block">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">
            <Sparkles className="size-4 text-amber-300" aria-hidden="true" />
            English Remedial Classes
          </div>

          <div className="max-w-2xl">
            <div className="mb-5 flex items-center gap-4">
              <div className="grid size-16 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
                <GraduationCap className="size-9 text-cyan-200" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-200">Learning Is Fun</p>
                <h1 className="mt-1 text-4xl font-black tracking-tight xl:text-5xl">Learn better. Grow brighter.</h1>
              </div>
            </div>

            <p className="max-w-xl text-lg leading-8 text-slate-200">
              A focused learning space for students, parents and educators to stay connected with classes, practice, progress and important updates.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {learningHighlights.map(({ icon: Icon, text }) => (
                <div key={text} className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                  <Icon className="mb-3 size-5 text-emerald-200" aria-hidden="true" />
                  <p className="text-sm font-medium leading-6 text-slate-100">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 flex items-center gap-3 text-sm text-slate-300">
            <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">Read</span>
            <span>•</span>
            <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">Write</span>
            <span>•</span>
            <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">Practice</span>
            <span>•</span>
            <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">Improve</span>
          </div>
        </section>

        <section className="flex items-center justify-center">
          <Card className="w-full max-w-md border-white/40 bg-white/95 shadow-2xl shadow-black/25 backdrop-blur-xl">
            <CardHeader className="items-center px-6 pb-4 pt-7 text-center sm:px-8">
              <div className="mb-4 grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-sky-100 to-emerald-100 ring-1 ring-sky-200">
                <GraduationCap className="size-9 text-sky-700" aria-hidden="true" />
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-700">Learning Is Fun!!!</p>
              <CardTitle className="mt-2 text-3xl font-black tracking-tight">{title}</CardTitle>
              <CardDescription className="max-w-sm text-sm leading-6">{description}</CardDescription>
            </CardHeader>
            {children ? <CardContent className="px-6 pb-7 sm:px-8">{children}</CardContent> : null}
          </Card>
        </section>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-xs text-white/55 lg:hidden">
        Learn • Practice • Progress
      </div>
    </main>
  );
}

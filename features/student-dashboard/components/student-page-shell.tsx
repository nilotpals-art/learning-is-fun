import type { ReactNode } from "react";

export function StudentPageShell({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <div className="space-y-6"><header className="rounded-3xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white shadow-lg"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-100">Student Portal</p><h1 className="mt-2 text-3xl font-bold">{title}</h1><p className="mt-2 max-w-2xl text-indigo-100">{description}</p></header>{children}</div>;
}

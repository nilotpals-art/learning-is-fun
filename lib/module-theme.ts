export type ModuleTheme =
  | "dashboard"
  | "students"
  | "academic-years"
  | "school-boards"
  | "classes"
  | "subjects"
  | "batches"
  | "fee-heads"
  | "payment-modes"
  | "attendance"
  | "practice-work"
  | "examinations"
  | "marks"
  | "report-cards"
  | "reports"
  | "settings";

export interface ModuleThemeClasses {
  header: string;
  icon: string;
  soft: string;
  border: string;
}

export const moduleThemes: Record<ModuleTheme, ModuleThemeClasses> = {
  dashboard: { header: "from-indigo-800 via-indigo-700 to-violet-700", icon: "bg-white/15 text-white", soft: "bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200", border: "border-indigo-400" },
  students: { header: "from-blue-800 via-blue-700 to-indigo-700", icon: "bg-white/15 text-white", soft: "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200", border: "border-blue-500" },
  "academic-years": { header: "from-violet-800 via-purple-700 to-fuchsia-700", icon: "bg-white/15 text-white", soft: "bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200", border: "border-violet-500" },
  "school-boards": { header: "from-cyan-800 via-sky-700 to-blue-700", icon: "bg-white/15 text-white", soft: "bg-cyan-50 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200", border: "border-cyan-500" },
  classes: { header: "from-emerald-800 via-emerald-700 to-teal-700", icon: "bg-white/15 text-white", soft: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200", border: "border-emerald-500" },
  subjects: { header: "from-orange-800 via-orange-700 to-amber-700", icon: "bg-white/15 text-white", soft: "bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-200", border: "border-orange-500" },
  batches: { header: "from-teal-800 via-teal-700 to-cyan-700", icon: "bg-white/15 text-white", soft: "bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-200", border: "border-teal-500" },
  "fee-heads": { header: "from-emerald-800 via-green-700 to-teal-700", icon: "bg-white/15 text-white", soft: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200", border: "border-emerald-500" },
  "payment-modes": { header: "from-blue-800 via-indigo-700 to-blue-700", icon: "bg-white/15 text-white", soft: "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200", border: "border-blue-500" },
  attendance: { header: "from-green-900 via-green-800 to-emerald-700", icon: "bg-white/15 text-white", soft: "bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-200", border: "border-green-600" },
  "practice-work": { header: "from-amber-800 via-amber-700 to-orange-700", icon: "bg-white/15 text-white", soft: "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200", border: "border-amber-500" },
  examinations: { header: "from-red-900 via-red-800 to-rose-700", icon: "bg-white/15 text-white", soft: "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200", border: "border-red-600" },
  marks: { header: "from-rose-900 via-rose-800 to-pink-700", icon: "bg-white/15 text-white", soft: "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200", border: "border-rose-500" },
  "report-cards": { header: "from-violet-900 via-violet-800 to-purple-700", icon: "bg-white/15 text-white", soft: "bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200", border: "border-violet-500" },
  reports: { header: "from-purple-900 via-purple-800 to-indigo-700", icon: "bg-white/15 text-white", soft: "bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-200", border: "border-purple-500" },
  settings: { header: "from-slate-900 via-slate-800 to-slate-700", icon: "bg-white/15 text-white", soft: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200", border: "border-slate-500" },
};

import { BookOpen, GraduationCap, Sparkles } from "lucide-react";
import { StudentDashboard } from "@/features/student-dashboard/components/student-dashboard";
import { getStudentDashboardData } from "@/features/student-dashboard/services/student-dashboard-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { createClient } from "@/lib/supabase/server";

function birthdayToday(dateOfBirth: string | null | undefined): boolean {
  if (!dateOfBirth) return false;
  const [, month, day] = dateOfBirth.slice(0, 10).split("-");
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const todayMonth = parts.find((part) => part.type === "month")?.value;
  const todayDay = parts.find((part) => part.type === "day")?.value;
  return month === todayMonth && day === todayDay;
}

export default async function StudentDashboardPage() {
  const profile = await requireRole(["Student"]);
  const data = await getStudentDashboardData(profile);
  let isBirthday = false;

  if (profile.instituteId) {
    const supabase = await createClient();
    const { data: student } = await supabase
      .from("students")
      .select("date_of_birth")
      .eq("id", data.student.id)
      .eq("institute_id", profile.instituteId)
      .maybeSingle();
    isBirthday = birthdayToday(student?.date_of_birth ?? null);
  }

  return (
    <div className="relative -m-4 min-h-[calc(100vh-4rem)] overflow-hidden bg-[radial-gradient(circle_at_8%_8%,rgba(34,211,238,0.18),transparent_25%),radial-gradient(circle_at_92%_12%,rgba(217,70,239,0.15),transparent_27%),radial-gradient(circle_at_50%_100%,rgba(251,191,36,0.13),transparent_32%),linear-gradient(135deg,#f8fbff_0%,#f5f3ff_48%,#fff7ed_100%)] p-4 sm:-m-6 sm:p-6 dark:bg-[linear-gradient(135deg,#0f172a,#172554,#3b0764)]">
      <div className="pointer-events-none absolute left-8 top-8 hidden rotate-[-10deg] rounded-3xl border border-blue-200/50 bg-white/45 p-5 text-blue-700 shadow-lg backdrop-blur lg:block dark:bg-white/5 dark:text-blue-200"><BookOpen className="size-10" /></div>
      <div className="pointer-events-none absolute right-10 top-14 hidden rotate-[12deg] rounded-full border border-amber-200/60 bg-white/45 p-5 text-amber-500 shadow-lg backdrop-blur lg:block dark:bg-white/5"><Sparkles className="size-9" /></div>
      <div className="relative mx-auto max-w-[1500px] space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[1.75rem] border border-white/60 bg-white/70 px-5 py-5 shadow-lg backdrop-blur sm:px-7 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-md"><GraduationCap className="size-8" /></span>
            <div>
              <p className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">Learning Is Fun!!!</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.22em] text-blue-700 sm:text-sm dark:text-blue-200">English Remedial Classes</p>
            </div>
          </div>
          <p className="hidden text-sm font-semibold text-slate-500 sm:block dark:text-slate-300">Learn something new every day ✨</p>
        </div>
        <StudentDashboard data={data} isBirthday={isBirthday} />
      </div>
    </div>
  );
}

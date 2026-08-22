import { CheckCircle2 } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { loadEnrollmentInvite } from "@/features/student-enrollment/services/enrollment-service";

export default async function EnrollmentSuccessPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await loadEnrollmentInvite(token);
  if (!invite) notFound();
  if (invite.status !== "SUBMITTED") redirect(`/enroll/${token}`);
  const date = invite.submittedAt ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(invite.submittedAt)) : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "long", year: "numeric" }).format(new Date());
  return <main className="mx-auto flex min-h-screen max-w-2xl items-center px-4 py-12"><Card className="w-full"><CardContent className="p-8 text-center sm:p-12"><CheckCircle2 className="mx-auto size-16 text-emerald-600" /><p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Learning Is Fun</p><h1 className="mt-2 text-3xl font-bold">Thank you for your time.</h1><p className="mt-4 text-lg text-muted-foreground">Your child has been enrolled with Learning Is Fun.</p><div className="mx-auto mt-8 grid max-w-md gap-4 rounded-2xl border bg-muted/30 p-5 text-left"><div><p className="text-xs uppercase text-muted-foreground">Enrollment Date</p><p className="text-lg font-semibold">{date}</p></div><div><p className="text-xs uppercase text-muted-foreground">Roll / Admission Number</p><p className="text-2xl font-bold">{invite.submittedAdmissionNumber}</p></div></div><p className="mt-6 text-sm text-muted-foreground">Please keep this number for future reference.</p></CardContent></Card></main>;
}

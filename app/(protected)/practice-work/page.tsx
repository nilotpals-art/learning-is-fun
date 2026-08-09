import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PracticeShell } from "@/features/practice-work/components/practice-shell";
import { getPracticeAnalytics } from "@/features/practice-work/services/practice-work-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function PracticeWorkPage() {
  const profile = await requireRole(DASHBOARD_ROLES);
  const analytics = await getPracticeAnalytics(profile);
  const cards = [{ label: "Question Bank", value: analytics.totalQuestions }, { label: "Practice Sets", value: analytics.totalSets }, { label: "Published", value: analytics.publishedSets }, { label: "Assignments", value: analytics.totalAssignments }];
  return <PracticeShell title="Practice Work" description="Create answer-backed remedial practice, assign it safely, and review improvement."><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <Card key={card.label}><CardHeader><CardTitle>{card.label}</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{card.value}</CardContent></Card>)}</div><Card><CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-3"><Button nativeButton={false} render={<Link href="/practice-work/question-bank/generate"/>}>Generate Questions</Button><Button nativeButton={false} variant="outline" render={<Link href="/practice-work/sets"/>}>Build Practice Set</Button><Button nativeButton={false} variant="outline" render={<Link href="/practice-work/assignments"/>}>Assign Practice</Button></CardContent></Card></PracticeShell>;
}

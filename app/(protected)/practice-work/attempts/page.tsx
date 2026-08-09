import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PracticeShell } from "@/features/practice-work/components/practice-shell";
import { listAttemptSummaries } from "@/features/practice-work/services/practice-work-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";
export default async function AttemptsPage(){const profile=await requireRole(DASHBOARD_ROLES),attempts=await listAttemptSummaries(profile);return <PracticeShell title="Student Attempts" description="Review attempt status and outcomes without changing submitted answers.">{attempts.length?<div className="space-y-3">{attempts.map(attempt=><Card key={attempt.id}><CardContent className="flex flex-wrap items-center justify-between gap-3 p-5"><div><p className="font-semibold">{attempt.practiceSetTitle}</p><p className="text-sm text-muted-foreground">{attempt.studentName} · Attempt {attempt.attemptNo} · {new Date(attempt.startedAt).toLocaleString()}</p></div><div className="flex items-center gap-2"><Badge>{attempt.status}</Badge>{attempt.percentage!==null&&<Badge>{attempt.percentage.toFixed(1)}%</Badge>}</div></CardContent></Card>)}</div>:<Card><CardContent className="p-8 text-center text-muted-foreground">No Student attempts yet.</CardContent></Card>}</PracticeShell>}

import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PracticeShell } from "@/features/practice-work/components/practice-shell";
import { listPracticeSets } from "@/features/practice-work/services/practice-work-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";
export default async function SetDetailPage({params}:{params:Promise<{id:string}>}){const profile=await requireRole(DASHBOARD_ROLES),{id}=await params,set=(await listPracticeSets(profile)).find(item=>item.id===id);if(!set)notFound();return <PracticeShell title={set.title} description={`${set.questionCount} Questions · ${set.totalMarks} marks`}><div className="space-y-3">{set.questions.map(question=><Card key={question.id}><CardContent className="p-5"><div className="flex justify-between gap-3"><p className="font-semibold">{question.displayOrder}. {question.questionText}</p><Badge>{question.marks} marks</Badge></div><p className="mt-2 text-sm text-muted-foreground">{question.questionType.replaceAll("_"," ")} · {question.difficulty}</p></CardContent></Card>)}</div></PracticeShell>}

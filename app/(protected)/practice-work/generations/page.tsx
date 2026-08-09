import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PracticeShell } from "@/features/practice-work/components/practice-shell";
import { listGenerations } from "@/features/practice-work/services/ai-question-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";
export default async function GenerationsPage(){const profile=await requireRole(DASHBOARD_ROLES),items=await listGenerations(profile);return <PracticeShell title="Generation History" description="Audit AI requests and their review outcomes.">{items.length?<div className="grid gap-4 lg:grid-cols-2">{items.map(item=><Card key={item.id}><CardContent className="space-y-2 p-5"><div className="flex justify-between gap-3"><p className="font-semibold">{item.bookName??"GENERAL PRACTICE"}{item.chapter?` · ${item.chapter}`:""}</p><Badge>{item.status}</Badge></div><p className="text-sm text-muted-foreground">Requested {item.requestedCount} · Generated {item.generatedCount} · Approved {item.approvedCount} · Rejected {item.rejectedCount}</p><p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()} · {item.model}</p><Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/practice-work/question-bank/generate?generation=${item.id}`}/>}>Open Review</Button></CardContent></Card>)}</div>:<Card><CardContent className="p-8 text-center text-muted-foreground">No AI generations yet.</CardContent></Card>}</PracticeShell>}

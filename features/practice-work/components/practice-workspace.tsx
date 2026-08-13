"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AiGenerationManager } from "@/features/practice-work/components/ai-generation-manager";
import { AssignmentsManager } from "@/features/practice-work/components/assignments-manager";
import { PracticeSetManager } from "@/features/practice-work/components/practice-set-manager";
import { QuestionBankManager } from "@/features/practice-work/components/question-bank-manager";
import { TemplatesManager } from "@/features/practice-work/components/templates-manager";
import type { BankQuestion, GeneratedQuestion, PracticeAssignment, PracticeOptions, PracticeSet, QuestionTemplate } from "@/features/practice-work/types/practice-work";

interface Props { templates: QuestionTemplate[]; options: PracticeOptions; questions: BankQuestion[]; sets: PracticeSet[]; assignments: PracticeAssignment[]; generationId?: string; generatedQuestions: GeneratedQuestion[] }

export function PracticeWorkspace(props: Props) {
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  return <div className="space-y-12">
    <nav aria-label="Practice Work workflow" className="flex flex-wrap gap-2">{["create-questions", "review", "saved-questions", "create-practice-work", "existing-practice-work", "assign"].map((id, index) => <Button key={id} nativeButton={false} size="sm" variant="outline" render={<a href={`#${id}`} />}>{index + 1}. {id.replaceAll("-", " ")}</Button>)}</nav>

    <WorkspaceSection id="create-questions" number="1" title="Create Questions" description="Generate with AI or import a private source file into the shared draft-review workflow." actions={<><Button variant="outline" onClick={() => setTemplatesOpen(true)}>Manage Templates</Button><Button nativeButton={false} variant="outline" render={<Link href="/practice-work/generations" />}>Generation / Import History</Button></>}>
      <AiGenerationManager templates={props.templates} options={props.options} generationId={props.generationId} questions={props.generatedQuestions} workspace />
    </WorkspaceSection>

    {!props.generationId ? <WorkspaceSection id="review" number="2" title="Review Questions" description="Generated and imported drafts open here through the generation URL state."><Card><CardContent className="p-8 text-center text-muted-foreground">Create or reopen a generation to review its draft Questions.</CardContent></Card></WorkspaceSection> : null}

    <WorkspaceSection id="saved-questions" number="3" title="Saved Questions" description="Filter and reuse the institute&apos;s approved Question Bank."><QuestionBankManager questions={props.questions} templates={props.templates} options={props.options} selectedIds={selectedQuestionIds} onSelectionChange={setSelectedQuestionIds} /></WorkspaceSection>

    <WorkspaceSection id="create-practice-work" number="4" title="Create Practice Work" description="Select saved Questions, review marks and save an immutable Practice Work draft.">{!selectedQuestionIds.length?<p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Select one or more saved Questions in Step 3 before creating Practice Work.</p>:null}<PracticeSetManager key={selectedQuestionIds.join(",")} sets={[]} questions={props.questions.filter((question)=>selectedQuestionIds.includes(question.id))} options={props.options} /></WorkspaceSection>

    <WorkspaceSection id="existing-practice-work" number="5" title="Existing Practice Work" description="Review persisted Practice Work and continue to assignment, attempts or analytics."><ExistingPracticeWork sets={props.sets} /></WorkspaceSection>

    <WorkspaceSection id="assign" number="6" title="Assign" description="Assign published Practice Work to an eligible Batch or selected Students."><AssignmentsManager sets={props.sets} assignments={props.assignments} options={props.options} /></WorkspaceSection>

    <Dialog open={templatesOpen} onOpenChange={setTemplatesOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl"><DialogHeader><DialogTitle>Manage Question Templates</DialogTitle><DialogDescription>Edit, duplicate, deactivate or reactivate reusable institute templates.</DialogDescription></DialogHeader><TemplatesManager templates={props.templates} /></DialogContent></Dialog>
  </div>;
}

function WorkspaceSection({ id, number, title, description, actions, children }: { id: string; number: string; title: string; description: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return <section id={id} className="scroll-mt-24 space-y-5"><header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">Step {number}</p><h2 className="text-2xl font-bold tracking-tight">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>{actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}</header>{children}</section>;
}

function ExistingPracticeWork({ sets }: { sets: PracticeSet[] }) {
  if (!sets.length) return <Card><CardContent className="p-8 text-center text-muted-foreground">No Practice Work has been created yet.</CardContent></Card>;
  return <div className="grid gap-4 lg:grid-cols-2">{sets.map((set) => <Card key={set.id}><CardContent className="space-y-3 p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{set.title}</p><p className="text-sm text-muted-foreground">{[set.boardName, set.className].filter(Boolean).join(" · ") || "Board / Class not specified"}</p></div><Badge>{set.status}</Badge></div><p className="text-sm">{set.questionCount} Questions · {set.totalMarks} marks</p><p className="text-xs text-muted-foreground">Created {set.createdAt ? new Date(set.createdAt).toLocaleDateString("en-IN") : "—"} · Assignments {set.assignmentCount ?? 0}{set.completedAssignmentCount ? ` (${set.completedAssignmentCount} completed)` : ""}</p><div className="flex flex-wrap gap-2"><Button nativeButton={false} size="sm" variant="outline" render={<a href="#assign" />}>Assign</Button><Button nativeButton={false} size="sm" variant="outline" render={<Link href="/practice-work/attempts" />}>View Attempts</Button><Button nativeButton={false} size="sm" variant="outline" render={<Link href="/practice-work/analytics" />}>View Analytics</Button></div></CardContent></Card>)}</div>;
}

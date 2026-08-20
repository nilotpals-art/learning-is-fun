"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { combineQuestionPapersAction, createQuestionPaperAction, deleteQuestionPaperAction } from "@/features/practice-work/actions/question-paper-actions";
import type { BankQuestion, PracticeOptions, PracticeSet } from "@/features/practice-work/types/practice-work";

type CreateMode = "manual" | "combine" | null;

export function QuestionPaperManager({ papers, questions, options }: { papers: PracticeSet[]; questions: BankQuestion[]; options: PracticeOptions }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [createMode, setCreateMode] = useState<CreateMode>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [selectedPapers, setSelectedPapers] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const filtered = useMemo(() => questions.filter((q) => q.isActive && (!search || `${q.questionText} ${q.boardName ?? ""} ${q.className ?? ""}`.toLowerCase().includes(search.toLowerCase()))), [questions, search]);

  const finish = (operation: () => Promise<{ status: string; message: string; data?: { id: string } }>) => startTransition(async () => {
    const result = await operation();
    setMessage(result.message);
    if (result.status === "success" && result.data?.id) {
      setCreateMode(null);
      setSelectedQuestions([]);
      setSelectedPapers([]);
      router.push(`/practice-work/papers/${result.data.id}`);
    }
  });

  const remove = (paper: PracticeSet) => {
    const assigned = paper.assignmentCount ?? 0;
    const warning = assigned > 0
      ? `Permanently delete ${paper.title}?\n\nThis paper is assigned to ${assigned} student${assigned === 1 ? "" : "s"}. Deleting it will remove those assignments from student portals and permanently delete any attempts and answers for this paper. This cannot be undone.`
      : `Permanently delete ${paper.title}? This cannot be undone.`;
    if (!window.confirm(warning)) return;
    startTransition(async () => {
      const result = await deleteQuestionPaperAction({ paperId: paper.id });
      setMessage(result.message);
      if (result.status === "success") router.refresh();
    });
  };

  return <div className="space-y-6">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Link className={buttonVariants()} href="/practice-work/question-bank/generate">Generate with AI</Link>
      <Link className={buttonVariants({ variant: "outline" })} href="/practice-work">Import Questions</Link>
      <Button variant={createMode === "manual" ? "default" : "outline"} onClick={() => setCreateMode((value) => value === "manual" ? null : "manual")}>Create Manually</Button>
      <Button variant={createMode === "combine" ? "default" : "outline"} onClick={() => setCreateMode((value) => value === "combine" ? null : "combine")}>Combine Papers</Button>
    </div>

    {createMode === "manual" ? <Card><CardHeader><CardTitle>Create a New Question Paper</CardTitle></CardHeader><CardContent className="space-y-4">
      <p className="text-sm text-muted-foreground">Select reusable questions for this paper. This internal question source is hidden again after the paper is created.</p>
      <form action={(form) => finish(() => createQuestionPaperAction({ academicYearId: form.get("academicYearId"), paperType: form.get("paperType"), instructions: form.get("instructions") || undefined, questionIds: selectedQuestions }))} className="grid gap-4 md:grid-cols-3">
        <label className="text-sm font-medium">Academic Year<select name="academicYearId" required className="mt-1 h-10 w-full rounded-xl border bg-card px-3">{options.academicYears.map((year) => <option key={year.id} value={year.id}>{year.label}</option>)}</select></label>
        <label className="text-sm font-medium">Paper Type<Input name="paperType" required defaultValue="PRACTICE" /></label>
        <label className="text-sm font-medium md:col-span-3">Instructions<textarea name="instructions" defaultValue="ANSWER ALL QUESTIONS." className="mt-1 min-h-20 w-full rounded-xl border bg-card p-3" /></label>
        <div className="md:col-span-3"><Input placeholder="Search available questions" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="max-h-[30rem] space-y-2 overflow-auto md:col-span-3">{filtered.map((q) => <label key={q.id} className="flex items-start gap-3 rounded-xl border p-3 text-sm"><input type="checkbox" checked={selectedQuestions.includes(q.id)} onChange={(e) => setSelectedQuestions((current) => e.target.checked ? [...current, q.id] : current.filter((id) => id !== q.id))} /><span className="flex-1"><strong>{q.questionText}</strong><span className="mt-1 block text-xs text-muted-foreground">{[q.boardName, q.className, q.subjectName, `${q.suggestedMarks ?? 1} marks`].filter(Boolean).join(" · ")}</span></span></label>)}</div>
        <div className="flex flex-wrap gap-2 md:col-span-3"><Button disabled={pending || !selectedQuestions.length}>Create Editable Paper ({selectedQuestions.length})</Button><Button type="button" variant="outline" onClick={() => { setCreateMode(null); setSelectedQuestions([]); }}>Cancel</Button></div>
      </form>
    </CardContent></Card> : null}

    {createMode === "combine" ? <Card><CardHeader><CardTitle>Combine 2 or 3 Existing Papers</CardTitle></CardHeader><CardContent><form action={(form) => finish(() => combineQuestionPapersAction({ sourcePaperIds: selectedPapers, paperType: form.get("paperType") }))} className="space-y-4">
      <label className="block max-w-sm text-sm font-medium">New Paper Type<Input name="paperType" required defaultValue="COMBINED" /></label>
      <div className="divide-y rounded-xl border">{papers.map((paper) => <label key={paper.id} className="flex items-center gap-3 px-3 py-2.5"><input type="checkbox" checked={selectedPapers.includes(paper.id)} disabled={!selectedPapers.includes(paper.id) && selectedPapers.length >= 3} onChange={(e) => setSelectedPapers((current) => e.target.checked ? [...current, paper.id] : current.filter((id) => id !== paper.id))} /><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{paper.title}</strong><span className="block text-xs text-muted-foreground">{paper.questionCount} questions · {paper.totalMarks} marks</span></span><Badge>{paper.status}</Badge></label>)}</div>
      <div className="flex flex-wrap gap-2"><Button disabled={pending || selectedPapers.length < 2}>Combine Selected ({selectedPapers.length})</Button><Button type="button" variant="outline" onClick={() => { setCreateMode(null); setSelectedPapers([]); }}>Cancel</Button></div>
    </form></CardContent></Card> : null}

    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Question Papers</h2><span className="text-xs text-muted-foreground">{papers.length} paper{papers.length === 1 ? "" : "s"}</span></div>
      {papers.length ? <div className="overflow-hidden rounded-xl border bg-card">
        <div className="hidden grid-cols-[minmax(0,1fr)_88px_90px_110px_auto] gap-3 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground md:grid">
          <span>Paper</span><span>Status</span><span>Questions</span><span>Assigned</span><span className="text-right">Actions</span>
        </div>
        <div className="divide-y">{papers.map((paper) => <div key={paper.id} className="grid gap-2 px-3 py-2.5 md:grid-cols-[minmax(0,1fr)_88px_90px_110px_auto] md:items-center md:gap-3">
          <div className="min-w-0"><Link href={`/practice-work/papers/${paper.id}`} className="block truncate text-sm font-medium hover:underline">{paper.title}</Link><p className="mt-0.5 text-xs text-muted-foreground md:hidden">{paper.questionCount} questions · {paper.totalMarks} marks · {paper.assignmentCount ?? 0} assigned</p></div>
          <div><Badge>{paper.status}</Badge></div>
          <span className="hidden text-sm md:block">{paper.questionCount}</span>
          <span className="hidden text-sm md:block">{paper.assignmentCount ?? 0}</span>
          <div className="flex flex-wrap gap-1.5 md:justify-end">
            <Link className={buttonVariants({ size: "sm", variant: "outline" })} href={`/practice-work/papers/${paper.id}`}>Open</Link>
            <a className={buttonVariants({ size: "sm", variant: "outline" })} href={`/practice-work/papers/${paper.id}/pdf`} target="_blank" rel="noreferrer">PDF</a>
            <Link className={buttonVariants({ size: "sm", variant: "outline" })} href="/practice-work/assignments">Assign</Link>
            <Button size="sm" variant="destructive" disabled={pending} onClick={() => remove(paper)}>Delete</Button>
          </div>
        </div>)}</div>
      </div> : <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No question papers yet.</div>}
    </section>
    {message && <p role="status" className="text-sm">{message}</p>}
  </div>;
}

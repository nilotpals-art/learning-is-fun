"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { updateQuestionPaperAction } from "@/features/practice-work/actions/question-paper-actions";
import { publishPracticeSetAction } from "@/features/practice-work/actions/practice-work-actions";
import type { PracticeSet } from "@/features/practice-work/types/practice-work";

export function QuestionPaperEditor({ paper, initialInstructions }: { paper: PracticeSet; initialInstructions: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(paper.title);
  const [instructions, setInstructions] = useState(initialInstructions);
  const [questions, setQuestions] = useState(paper.questions.map((q) => ({ id: q.id, questionText: q.questionText, marks: q.marks, displayOrder: q.displayOrder })));
  const [message, setMessage] = useState("");
  const editable = paper.status === "draft";

  const save = () => startTransition(async () => {
    const result = await updateQuestionPaperAction({ paperId: paper.id, title, instructions, questions });
    setMessage(result.message);
    if (result.status === "success") router.refresh();
  });

  const publish = () => startTransition(async () => {
    const saveResult = await updateQuestionPaperAction({ paperId: paper.id, title, instructions, questions });
    if (saveResult.status !== "success") { setMessage(saveResult.message); return; }
    const publishResult = await publishPracticeSetAction({ id: paper.id });
    setMessage(publishResult.message);
    if (publishResult.status === "success") router.refresh();
  });

  const move = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= questions.length) return;
    const next = [...questions];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setQuestions(next.map((q, i) => ({ ...q, displayOrder: i + 1 })));
  };

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><Badge>{paper.status}</Badge><p className="mt-2 text-sm text-muted-foreground">{paper.questionCount} questions · {paper.totalMarks} marks</p></div>
      <div className="flex flex-wrap gap-2"><a className={buttonVariants({ variant: "outline" })} href={`/practice-work/papers/${paper.id}/pdf`} target="_blank" rel="noreferrer">Open PDF</a><Link className={buttonVariants({ variant: "outline" })} href="/practice-work/assignments">Assign</Link><Button variant="outline" onClick={() => { const text = encodeURIComponent(`Learning Is Fun question paper: ${window.location.origin}/practice-work/papers/${paper.id}/pdf`); window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer"); }}>WhatsApp</Button></div>
    </div>

    <Card><CardContent className="space-y-4 p-5">
      <label className="block text-sm font-medium">Paper Name<Input value={title} disabled={!editable} onChange={(e) => setTitle(e.target.value)} /></label>
      <label className="block text-sm font-medium">Instructions<textarea value={instructions} disabled={!editable} onChange={(e) => setInstructions(e.target.value)} className="mt-1 min-h-24 w-full rounded-xl border bg-card p-3" /></label>
    </CardContent></Card>

    <div className="mx-auto max-w-[210mm] space-y-4 rounded-md border bg-white p-6 text-black shadow-sm print:shadow-none">
      <div className="border-b pb-4 text-center"><p className="text-xl font-bold">LEARNING IS FUN</p><p className="text-sm">English Remedial Classes</p><p className="mt-2 font-semibold">{title}</p></div>
      <div className="whitespace-pre-wrap text-sm">{instructions}</div>
      {questions.map((question, index) => <div key={question.id} className="rounded-md border border-gray-300 p-4">
        <div className="mb-2 flex items-center justify-between gap-3"><strong>Question {index + 1}</strong><span className="text-sm">[{question.marks} marks]</span></div>
        {editable ? <textarea value={question.questionText} onChange={(e) => setQuestions((current) => current.map((q) => q.id === question.id ? { ...q, questionText: e.target.value } : q))} className="min-h-24 w-full rounded-md border p-2" /> : <p>{question.questionText}</p>}
        {editable && <div className="mt-3 flex flex-wrap items-center gap-2"><label className="text-xs">Marks <Input className="w-24" type="number" min="0.25" step="0.25" value={question.marks} onChange={(e) => setQuestions((current) => current.map((q) => q.id === question.id ? { ...q, marks: Number(e.target.value) } : q))} /></label><Button type="button" size="sm" variant="outline" onClick={() => move(index, -1)}>Move Up</Button><Button type="button" size="sm" variant="outline" onClick={() => move(index, 1)}>Move Down</Button><Button type="button" size="sm" variant="outline" onClick={() => setQuestions((current) => current.filter((q) => q.id !== question.id).map((q, i) => ({ ...q, displayOrder: i + 1 })))}>Remove</Button></div>}
      </div>)}
    </div>

    {editable && <div className="flex flex-wrap gap-2"><Button disabled={pending || !questions.length} onClick={save}>Save Paper</Button><Button disabled={pending || !questions.length} variant="outline" onClick={publish}>Save & Publish for Assignment</Button></div>}
    {message && <p role="status" className="text-sm">{message}</p>}
  </div>;
}

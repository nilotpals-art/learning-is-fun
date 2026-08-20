"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { retryIncorrectAction, startPracticeAttemptAction, submitPracticeAttemptAction } from "@/features/practice-work/actions/practice-work-actions";
import type { AttemptSession, PracticeAssignment, SubmitAttemptResult } from "@/features/practice-work/types/practice-work";

export function StudentPracticeManager({ assignments }: { assignments: PracticeAssignment[] }) {
  const [pending, startTransition] = useTransition();
  const [session, setSession] = useState<AttemptSession | null>(null);
  const [result, setResult] = useState<SubmitAttemptResult | null>(null);
  const [message, setMessage] = useState("");

  const start = (assignmentId: string) => startTransition(async () => {
    const response = await startPracticeAttemptAction({ assignmentId });
    setMessage(response.message);
    if (response.status === "success" && response.data) { setSession(response.data); setResult(null); }
  });

  if (session && !result) return <Card><CardHeader><CardTitle>{session.title ?? "Practice Work"}</CardTitle></CardHeader><CardContent><form action={(formData) => startTransition(async () => {
    const answers = session.questions.map((question) => ({ questionId: question.id, answer: String(formData.get(question.id) ?? "").trim() }));
    const response = await submitPracticeAttemptAction({ attemptId: session.attemptId, answers });
    setMessage(response.message); if (response.status === "success" && response.data) setResult(response.data);
  })} className="space-y-5">{session.questions.map((question) => <fieldset key={question.id} className="rounded-xl border p-4"><legend className="px-2 font-semibold">{question.displayOrder}. {question.questionText}</legend>{question.options?.length ? <div className="mt-3 grid gap-2">{question.options.map((option) => <label key={`${question.id}-${option}`} className="flex gap-2"><input required name={question.id} type="radio" value={option}/><span>{option}</span></label>)}</div> : <Input className="mt-3" required name={question.id} aria-label={`Answer for question ${question.displayOrder}`}/>}<p className="mt-2 text-xs text-muted-foreground">{question.marks} marks</p></fieldset>)}<Button disabled={pending}>Submit Practice</Button>{message && <p role="status" className="text-sm">{message}</p>}</form></CardContent></Card>;

  if (session && result) return <Card><CardHeader><CardTitle>Practice Review</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-2xl font-bold">{result.scoreObtained}/{result.maxMarks} · {result.percentage.toFixed(1)}%</p>{result.review.map((review) => <div key={review.questionId} className="rounded-xl border p-4"><div className="flex justify-between gap-3"><p className="font-semibold">{review.questionText}</p><Badge>{review.isCorrect ? "Correct" : "Needs practice"}</Badge></div><p className="mt-2 text-sm">Your answer: {String(review.studentAnswer ?? "Not answered")}</p><p className="text-sm">Correct answer: {String(review.correctAnswer)}</p>{review.explanation && <p className="mt-2 text-sm text-muted-foreground">{review.explanation}</p>}</div>)}{result.review.some((item) => !item.isCorrect) && <Button disabled={pending} onClick={() => startTransition(async () => { const response = await retryIncorrectAction({ attemptId: session.attemptId }); setMessage(response.message); if (response.status === "success" && response.data) { setSession(response.data); setResult(null); } })}>Retry Incorrect Questions</Button>}{message && <p role="status" className="text-sm">{message}</p>}</CardContent></Card>;

  return <div className="grid gap-4 lg:grid-cols-2">{assignments.length ? assignments.map((assignment) => <Card key={assignment.id}><CardContent className="space-y-3 p-5"><div className="flex justify-between gap-3"><p className="font-semibold">{assignment.practiceSetTitle}</p><Badge>{assignment.status.replaceAll("_", " ")}</Badge></div><p className="text-sm text-muted-foreground">Due {assignment.dueAt ? new Date(assignment.dueAt).toLocaleString() : "Not set"}</p><div className="flex flex-wrap gap-2"><Button variant="outline" asChild><a href={`/practice-work/papers/${assignment.practiceSetId}/pdf`} target="_blank" rel="noreferrer">View PDF</a></Button><Button disabled={pending || assignment.status === "closed"} onClick={() => start(assignment.id)}>{assignment.status === "completed" ? "Try Again" : "Start Practice"}</Button></div></CardContent></Card>) : <Card><CardContent className="p-8 text-center text-muted-foreground">No Question Papers have been assigned yet.</CardContent></Card>}{message && <p role="status" className="text-sm">{message}</p>}</div>;
}

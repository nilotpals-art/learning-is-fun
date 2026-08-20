"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { createPaperFromGenerationAction } from "@/features/practice-work/actions/question-paper-actions";

export function CreatePaperFromGenerationButton({ generationId }: { generationId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  return <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4">
    <div className="min-w-0 flex-1"><p className="font-semibold">Ready to make the paper?</p><p className="text-sm text-muted-foreground">After approving the questions, group all approved questions into one editable paper.</p></div>
    <Button disabled={pending} onClick={() => startTransition(async () => {
      const result = await createPaperFromGenerationAction({ generationId });
      setMessage(result.message);
      if (result.status === "success" && result.data?.id) router.push(`/practice-work/papers/${result.data.id}`);
    })}>{pending ? "Creating Paper…" : "Create Question Paper"}</Button>
    {message && <p role="status" className="w-full text-sm">{message}</p>}
  </div>;
}

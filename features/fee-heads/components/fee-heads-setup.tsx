"use client";

import { AlertTriangle, CheckCircle2, CirclePlus, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createInitialFeeHeads } from "@/features/fee-heads/actions/fee-head-actions";
import type { FeeHeadSetupState } from "@/features/fee-heads/types/fee-head";

export function FeeHeadsSetup({ state }: { state: FeeHeadSetupState }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function initialize() {
    setFeedback(null);
    startTransition(async () => {
      const result = await createInitialFeeHeads();
      setFeedback({ type: result.status, message: result.message });
      if (result.status === "success") router.refresh();
    });
  }

  return (
    <Card className="border-primary/25 bg-primary/5">
      <CardHeader>
        <CardTitle>Recommended Fee Heads setup</CardTitle>
        <p className="text-sm text-muted-foreground">
          Review the institute&apos;s recommended Fee Heads, then create only the missing records.
          Existing and custom Fee Heads will not be changed.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {state.items.map((item) => (
            <div key={item.code} className="rounded-2xl border bg-background p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{item.name}</p>
                <Badge variant={item.status === "existing" ? "secondary" : item.status === "conflict" ? "destructive" : "outline"}>
                  {item.status === "existing" ? "Already exists" : item.status === "conflict" ? "Conflict" : "Will be created"}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{item.code} · {item.category}</p>
              <p className="mt-1 text-xs text-muted-foreground">Display Order: {item.displayOrder} · Active</p>
            </div>
          ))}
        </div>

        {state.conflicts.length > 0 ? (
          <div role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
            <div className="flex items-center gap-2 font-medium text-destructive"><AlertTriangle className="size-4" />Setup conflicts</div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {state.conflicts.map((conflict) => <li key={conflict}>{conflict}</li>)}
            </ul>
          </div>
        ) : null}

        {feedback ? (
          <p role={feedback.type === "error" ? "alert" : "status"} className={feedback.type === "error" ? "text-sm text-destructive" : "flex items-center gap-2 text-sm text-emerald-700"}>
            {feedback.type === "success" ? <CheckCircle2 className="size-4" /> : null}{feedback.message}
          </p>
        ) : null}

        <Button onClick={initialize} disabled={isPending || state.conflicts.length > 0 || state.missingCount === 0}>
          {isPending ? <Loader2 className="animate-spin" /> : <CirclePlus />}
          {isPending ? "Creating…" : "Create Initial Fee Heads"}
        </Button>
      </CardContent>
    </Card>
  );
}

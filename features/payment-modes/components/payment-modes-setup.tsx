"use client";

import { CheckCircle2, CirclePlus, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createInitialPaymentModes } from "@/features/payment-modes/actions/payment-mode-actions";
import type { PaymentModeSetupState } from "@/features/payment-modes/types/payment-mode";

export function PaymentModesSetup({ state }: { state: PaymentModeSetupState }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ status: "success" | "error"; message: string } | null>(null);

  function initialize() {
    setFeedback(null);
    startTransition(async () => {
      const result = await createInitialPaymentModes();
      setFeedback(result);
      if (result.status === "success") router.refresh();
    });
  }

  return (
    <Card className="border-primary/25 bg-primary/5">
      <CardHeader>
        <CardTitle>Recommended Payment Modes setup</CardTitle>
        <p className="text-sm text-muted-foreground">
          Create only the missing standard payment methods. Existing custom modes remain unchanged.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {state.items.map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-3 rounded-2xl border bg-background p-4">
              <span className="font-medium">{item.name}</span>
              <Badge variant={item.exists ? "secondary" : "outline"}>{item.exists ? "Already exists" : "Will be created"}</Badge>
            </div>
          ))}
        </div>
        {feedback ? (
          <p role={feedback.status === "error" ? "alert" : "status"} className={feedback.status === "error" ? "text-sm text-destructive" : "flex items-center gap-2 text-sm text-emerald-700"}>
            {feedback.status === "success" ? <CheckCircle2 className="size-4" /> : null}{feedback.message}
          </p>
        ) : null}
        <Button onClick={initialize} disabled={isPending || state.missingCount === 0}>
          {isPending ? <Loader2 className="animate-spin" /> : <CirclePlus />}
          {isPending ? "Creating…" : "Create Initial Payment Modes"}
        </Button>
      </CardContent>
    </Card>
  );
}

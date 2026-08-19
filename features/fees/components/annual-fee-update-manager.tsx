"use client";

import { useMemo, useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

import { updateClassFeeRates } from "@/features/fees/actions/fee-structure-actions";
import type { FeeStructure } from "@/features/fees/types/fee-structure";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Toaster, toast } from "@/components/ui/toast";

const selectClass = "h-10 w-full rounded-2xl border border-input bg-background px-3 text-sm";

export function AnnualFeeUpdateManager({ structures }: { structures: FeeStructure[] }) {
  const active = structures.filter((s) => s.isActive);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [structureId, setStructureId] = useState(active[0]?.id ?? "");
  const selected = useMemo(() => active.find((s) => s.id === structureId) ?? null, [active, structureId]);
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [applyExisting, setApplyExisting] = useState(true);
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  function amountFor(itemId: string, current: number) {
    return amounts[itemId] ?? String(current);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const rates = selected.items.map((item) => ({ itemId: item.id, amount: Number(amountFor(item.id, item.amount)) }));
    start(async () => {
      const result = await updateClassFeeRates({ structureId: selected.id, effectiveFrom, applyExisting, rates });
      toast.add({ title: result.status === "success" ? "Fees updated" : "Unable to update", description: result.message, type: result.status === "success" ? "success" : "error" });
      if (result.status === "success") {
        setAmounts({});
        router.refresh();
      }
    });
  }

  return <Card>
    <Toaster />
    <CardHeader>
      <CardTitle className="flex items-center gap-2"><RefreshCw className="size-5" />Class-wise Annual Fee Update</CardTitle>
    </CardHeader>
    <CardContent className="space-y-5">
      <p className="text-sm text-muted-foreground">Update the active class fee rate here. New admissions use the revised fee automatically. When “Apply to existing students” is enabled, unpaid monthly dues on or after the effective date are revised too; paid receipts remain unchanged.</p>
      {active.length ? <form className="space-y-5" onSubmit={submit}>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-2 text-sm">Academic Year / Class
            <select className={selectClass} value={structureId} onChange={(e) => { setStructureId(e.target.value); setAmounts({}); }}>
              {active.map((s) => <option key={s.id} value={s.id}>{s.academicYearName} · {s.className} · {s.name}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm">Effective From
            <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} required />
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={applyExisting} onChange={(e) => setApplyExisting(e.target.checked)} />Apply to existing students</label>
        </div>
        {selected ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {selected.items.map((item) => <label key={item.id} className="grid gap-2 rounded-2xl border p-4 text-sm">
            <span className="font-medium">{item.feeHeadName}</span>
            <span className="text-xs text-muted-foreground">{item.scheduleType === "monthly" ? "Monthly fee" : `${item.scheduleType.replaceAll("_", " ")} · new admissions/future assignments`}</span>
            <Input type="number" min="0.01" step="0.01" value={amountFor(item.id, item.amount)} onChange={(e) => setAmounts((old) => ({ ...old, [item.id]: e.target.value }))} required />
          </label>)}
        </div> : null}
        <div className="rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground">Existing-student synchronization applies to <strong>monthly</strong> fee dues from the effective date onward. Already-paid months are never rewritten. If a month is partly paid, the amount already received is preserved.</div>
        <Button disabled={pending || !selected}>{pending ? "Updating…" : "Update Class Fees"}</Button>
      </form> : <p className="text-sm text-muted-foreground">Create and activate a class Fee Structure first.</p>}
    </CardContent>
  </Card>;
}

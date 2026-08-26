"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { PaymentDetailsCard } from "@/features/fees/components/fees-manager";
import { postFeePayment } from "@/features/fees/actions/fee-actions";
import type { FeeDue, FeeOption, FeeSettings, FeeStudent } from "@/features/fees/types/fees";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Toaster, toast } from "@/components/ui/toast";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
const date = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" });
const select = "h-10 w-full rounded-2xl border border-input bg-background px-3 text-sm";
const safeDate = (value: string) => new Date(value.includes("T") ? value : `${value}T00:00:00`);
type ReceiptDelivery = "none" | "whatsapp" | "email" | "both";

export function AdminCollectPayment({ students, years, modes, dues, settings }: { students: FeeStudent[]; years: FeeOption[]; modes: FeeOption[]; dues: FeeDue[]; settings: FeeSettings }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const [studentId, setStudent] = useState(students[0]?.id ?? "");
  const [yearId, setYear] = useState(years.find((year) => year.isCurrent)?.id ?? years[0]?.id ?? "");
  const [modeId, setMode] = useState(modes[0]?.id ?? "");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [referenceNo, setReferenceNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [receiptDelivery, setReceiptDelivery] = useState<ReceiptDelivery>("none");
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  const eligible = useMemo(
    () => dues.filter((due) => due.studentId === studentId && due.academicYearId === yearId && due.outstanding > 0),
    [dues, studentId, yearId],
  );
  const total = eligible.reduce((sum, due) => sum + Number(amounts[due.id] ?? 0), 0);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!studentId || !yearId || !modeId || total <= 0) {
      toast.add({ title: "Unable to post payment", description: "Select a student, academic year, payment mode, and enter an amount.", type: "error" });
      return;
    }

    start(async () => {
      const result = await postFeePayment({
        studentId,
        academicYearId: yearId,
        paymentModeId: modeId,
        paymentDate: new Date(`${paymentDate}T12:00:00+05:30`).toISOString(),
        referenceNo: referenceNo || null,
        remarks: remarks || null,
        receiptDelivery,
        allocations: eligible
          .map((due) => ({ dueId: due.id, amount: Number(amounts[due.id] ?? 0) }))
          .filter((allocation) => allocation.amount > 0),
      });

      toast.add({
        title: result.status === "success" ? "Payment posted" : "Unable to post payment",
        description: result.message,
        type: result.status === "success" ? "success" : "error",
      });
      if (result.status === "success") {
        setAmounts({});
        setReferenceNo("");
        setRemarks("");
        setReceiptDelivery("none");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Collect Payment" description="Record a fee payment, issue a receipt, and optionally send it by WhatsApp and/or email." />
      <PaymentDetailsCard settings={settings} />
      <Card>
        <CardHeader><CardTitle>Record Payment</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={submit}>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2 text-sm">Student<select className={select} value={studentId} onChange={(event) => { setStudent(event.target.value); setAmounts({}); }} required>{students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select></label>
              <label className="grid gap-2 text-sm">Academic Year<select className={select} value={yearId} onChange={(event) => { setYear(event.target.value); setAmounts({}); }} required>{years.map((year) => <option key={year.id} value={year.id}>{year.name}{year.isCurrent ? " (Current)" : ""}</option>)}</select></label>
              <label className="grid gap-2 text-sm">Payment Mode<select className={select} value={modeId} onChange={(event) => setMode(event.target.value)} required>{modes.map((mode) => <option key={mode.id} value={mode.id}>{mode.name}</option>)}</select></label>
              <label className="grid gap-2 text-sm">Payment Date<Input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} required /></label>
              <label className="grid gap-2 text-sm">Reference / Transaction No. <span className="text-xs text-muted-foreground">Optional</span><Input value={referenceNo} onChange={(event) => setReferenceNo(event.target.value)} /></label>
              <label className="grid gap-2 text-sm">Remarks <span className="text-xs text-muted-foreground">Optional</span><Input value={remarks} onChange={(event) => setRemarks(event.target.value)} /></label>
              <label className="grid gap-2 text-sm md:col-span-3">Send Paid Receipt<select className={select} value={receiptDelivery} onChange={(event) => setReceiptDelivery(event.target.value as ReceiptDelivery)}><option value="none">Don&apos;t Send</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="both">WhatsApp + Email</option></select><span className="text-xs text-muted-foreground">Email is sent to available Student/Parent email addresses. WhatsApp follows the configured fee recipient preference.</span></label>
            </div>

            {eligible.map((due) => (
              <label key={due.id} className="grid gap-2 rounded-2xl border p-4 text-sm md:grid-cols-[1fr_12rem] md:items-center">
                <span>{due.feeHeadName}<span className="block text-muted-foreground">Pending {money.format(due.outstanding)} · {date.format(safeDate(due.dueDate))}</span></span>
                <Input aria-label={`Payment toward ${due.feeHeadName}`} type="number" min="0" max={due.outstanding} step="0.01" value={amounts[due.id] ?? ""} onChange={(event) => setAmounts((current) => ({ ...current, [due.id]: event.target.value }))} />
              </label>
            ))}

            {eligible.length === 0 ? <p className="rounded-2xl border p-4 text-sm text-muted-foreground">No pending fees for the selected student and academic year.</p> : null}
            <div className="flex items-center justify-between gap-4">
              <strong>Total {money.format(total)}</strong>
              <Button type="submit" disabled={pending || total <= 0}>{pending ? "Posting…" : "Post Payment"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Toaster />
    </div>
  );
}

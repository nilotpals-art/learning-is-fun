"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Toaster, toast } from "@/components/ui/toast";
import { deleteFeePayment } from "@/features/fees/actions/delete-fee-payment";
import { reverseFeePayment } from "@/features/fees/actions/fee-actions";
import type { FeePayment } from "@/features/fees/types/fees";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
const date = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" });

function notify(result: { status: string; message: string }) {
  toast.add({
    title: result.status === "success" ? "Success" : "Unable to continue",
    description: result.message,
    type: result.status === "success" ? "success" : "error",
  });
}

export function AdminPaymentsManager({ payments }: { payments: FeePayment[] }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function reverse(payment: FeePayment) {
    const reason = window.prompt(`Enter reversal reason for ${payment.receiptNo}`);
    if (!reason) return;
    start(async () => {
      const result = await reverseFeePayment({ paymentId: payment.id, reason });
      notify(result);
      if (result.status === "success") router.refresh();
    });
  }

  function remove(payment: FeePayment) {
    const confirmation = window.prompt(
      `PERMANENT DELETE\n\nThis completely removes payment ${payment.receiptNo} and restores its fee balances. This cannot be undone.\n\nType the receipt number exactly to confirm:\n${payment.receiptNo}`,
    );
    if (!confirmation) return;
    start(async () => {
      const result = await deleteFeePayment({ paymentId: payment.id, receiptNo: confirmation });
      notify(result);
      if (result.status === "success") router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="Receipt history with reversal and permanent-delete controls for incorrect postings." />
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt</TableHead><TableHead>Student</TableHead><TableHead>Date</TableHead><TableHead>Mode</TableHead><TableHead>Reference</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell><Link className="font-medium underline-offset-4 hover:underline" href={`/fees/receipts/${payment.id}`}>{payment.receiptNo}</Link></TableCell>
                    <TableCell>{payment.studentName}</TableCell>
                    <TableCell>{date.format(new Date(payment.paymentDate))}</TableCell>
                    <TableCell>{payment.paymentModeName}</TableCell>
                    <TableCell>{payment.referenceNo || "—"}</TableCell>
                    <TableCell>{money.format(payment.amount)}</TableCell>
                    <TableCell><Badge>{payment.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {payment.status === "posted" ? <Button size="sm" variant="outline" disabled={pending} onClick={() => reverse(payment)}><RotateCcw /> Reverse</Button> : null}
                        <Button size="sm" variant="destructive" disabled={pending} onClick={() => remove(payment)}><Trash2 /> Delete</Button>
                      </div>
                      {payment.status !== "posted" && payment.reversalReason ? <span className="mt-1 block max-w-64 text-xs text-muted-foreground">{payment.reversalReason}</span> : null}
                    </TableCell>
                  </TableRow>
                ))}
                {payments.length === 0 ? <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">No fee payments yet.</TableCell></TableRow> : null}
              </TableBody>
            </Table>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Permanent Delete is intended only for incorrect postings. It removes the payment, allocations and queued fee-message records, then recalculates the affected dues.</p>
        </CardContent>
      </Card>
      <Toaster />
    </div>
  );
}

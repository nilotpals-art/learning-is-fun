import Link from "next/link";
import { CreditCard, IndianRupee, ReceiptText } from "lucide-react";

import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { FeeDue, FeePayment } from "@/features/fees/types/fees";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
const date = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });

function safeDate(value: string) {
  return new Date(value.includes("T") ? value : `${value}T00:00:00+05:30`);
}

export function StudentFeePortal({ dues, payments }: { dues: FeeDue[]; payments: FeePayment[] }) {
  const postedPayments = payments.filter((payment) => payment.status === "posted");
  const outstanding = dues.reduce((sum, due) => sum + due.outstanding, 0);
  const paidThisMonth = postedPayments.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="My Fees" description="Review this month's pending monthly fees and payment receipts." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Pending Fees" value={money.format(outstanding)} description="Monthly fees due through this month" icon={IndianRupee} />
        <StatCard title="Total Paid This Month" value={money.format(paidThisMonth)} description="Posted payments in the current month" icon={CreditCard} />
        <StatCard title="Receipts This Month" value={String(postedPayments.length)} description="Current-month posted receipts" icon={ReceiptText} />
      </div>

      <Card>
        <CardHeader><CardTitle>Pending Monthly Fees</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Fee Head</TableHead><TableHead>Due Date</TableHead><TableHead>Pending</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {dues.filter((due) => due.outstanding > 0).map((due) => (
                  <TableRow key={due.id}>
                    <TableCell>{due.feeHeadName}</TableCell>
                    <TableCell>{date.format(safeDate(due.dueDate))}</TableCell>
                    <TableCell>{money.format(due.outstanding)}</TableCell>
                    <TableCell><Badge variant="outline">Pending</Badge></TableCell>
                  </TableRow>
                ))}
                {dues.every((due) => due.outstanding <= 0) ? <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">No monthly fees are pending through this month.</TableCell></TableRow> : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Current Month Receipts</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Receipt</TableHead><TableHead>Date</TableHead><TableHead>Mode</TableHead><TableHead>Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {postedPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell><Link className="font-medium underline-offset-4 hover:underline" href={`/fees/receipts/${payment.id}`}>{payment.receiptNo}</Link></TableCell>
                    <TableCell>{date.format(new Date(payment.paymentDate))}</TableCell>
                    <TableCell>{payment.paymentModeName}</TableCell>
                    <TableCell>{money.format(payment.amount)}</TableCell>
                  </TableRow>
                ))}
                {postedPayments.length === 0 ? <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">No payment receipts for the current month.</TableCell></TableRow> : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

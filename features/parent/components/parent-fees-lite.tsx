"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { PaymentDetailsCard } from "@/features/fees/components/fees-manager";
import type { FeeDue, FeePayment, FeeSettings } from "@/features/fees/types/fees";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
const formatDate = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" });
function safeDate(value: string) { return new Date(value.includes("T") ? value : `${value}T00:00:00`); }

export function ParentFeesLite({ dues, payments, settings }: { dues: FeeDue[]; payments: FeePayment[]; settings: FeeSettings }) {
  const students = useMemo(() => [...new Map(dues.map((due) => [due.studentId, { id: due.studentId, name: due.studentName }])).values()], [dues]);
  const fallbackStudents = useMemo(() => [...new Map(payments.map((payment) => [payment.studentId, { id: payment.studentId, name: payment.studentName }])).values()], [payments]);
  const options = students.length ? students : fallbackStudents;
  const [studentId, setStudentId] = useState(options[0]?.id ?? "");
  const visibleDues = dues.filter((due) => !studentId || due.studentId === studentId);
  const visiblePayments = payments.filter((payment) => !studentId || payment.studentId === studentId);
  const unpaid = visibleDues.filter((due) => due.outstanding > 0);

  return <div className="space-y-6">
    <PageHeader title="Fees" description="View due items, payment details, and receipt history." />
    {options.length > 1 ? <Card><CardContent className="p-4"><label className="grid gap-2 text-sm">Student<select className="h-10 rounded-xl border bg-background px-3" value={studentId} onChange={(event) => setStudentId(event.target.value)}>{options.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select></label></CardContent></Card> : null}
    <Card><CardHeader><CardTitle>Due Items</CardTitle></CardHeader><CardContent className="space-y-3">{unpaid.length ? unpaid.map((due) => <div key={due.id} className="grid gap-1 rounded-xl border p-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="font-medium">{due.feeHeadName}</p><p className="text-sm text-muted-foreground">Due {formatDate.format(safeDate(due.dueDate))} · {due.academicYearName}</p></div><div className="text-left sm:text-right"><p className="font-semibold">{money.format(due.outstanding)}</p><p className="text-xs text-muted-foreground">Amount due</p></div></div>) : <p className="text-sm text-muted-foreground">No fee payment is currently due.</p>}</CardContent></Card>
    <PaymentDetailsCard settings={settings} title="Payment Details" />
    <Card><CardHeader><CardTitle>Payment History</CardTitle></CardHeader><CardContent className="space-y-3">{visiblePayments.length ? visiblePayments.filter((payment) => payment.status === "posted").map((payment) => <div key={payment.id} className="grid gap-1 rounded-xl border p-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="font-medium">Receipt {payment.receiptNo}</p><p className="text-sm text-muted-foreground">{formatDate.format(new Date(payment.paymentDate))} · {payment.paymentModeName}</p></div><div className="font-semibold">{money.format(payment.amount)}</div></div>) : <p className="text-sm text-muted-foreground">No posted payments yet.</p>}</CardContent></Card>
  </div>;
}

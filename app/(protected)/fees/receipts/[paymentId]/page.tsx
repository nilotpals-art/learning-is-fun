import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PrintButton } from "@/components/print/print-button";
import { PrintWatermark } from "@/components/print/print-watermark";
import { listFeePayments } from "@/features/fees/services/fee-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
const date = new Intl.DateTimeFormat("en-IN", { dateStyle: "long" });
const feeMonth = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" });

function safeDate(value: string) { return new Date(value.includes("T") ? value : `${value}T00:00:00`); }
function allocationLabel(allocation: { feeHeadName: string; dueDate: string; scheduleType: string | null }) {
  if (allocation.scheduleType === "monthly") return `${feeMonth.format(safeDate(allocation.dueDate))} · ${allocation.feeHeadName}`;
  return allocation.feeHeadName;
}

export default async function ReceiptPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const profile = await requireRole([...DASHBOARD_ROLES, "Student", "Parent"]);
  const { paymentId } = await params;
  const payment = (await listFeePayments(profile)).find((item) => item.id === paymentId);
  if (!payment) notFound();
  const backHref = profile.role === "Student" ? "/student/fees" : profile.role === "Parent" ? "/parent/fees" : "/fees/payments";
  const compact = payment.allocations.length > 10;

  return <div className="space-y-6">
    <style>{`@media print { @page { size: A4 portrait; margin: 8mm; } html, body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } .fee-receipt-page { page-break-inside: avoid !important; break-inside: avoid-page !important; } .fee-receipt-page * { page-break-inside: avoid; } }`}</style>
    <PrintWatermark instituteName={profile.instituteName} />
    <div className="print:hidden"><PageHeader title={`Receipt ${payment.receiptNo}`} description="Official fee payment receipt" /></div>
    <Card className="fee-receipt-page mx-auto max-w-3xl print:max-w-none print:border-0 print:shadow-none"><CardContent className={`${compact ? "space-y-3 pt-4 text-[12px]" : "space-y-5 pt-6"} print:space-y-3 print:p-0 print:text-[11px]`}>
      <div className="border-b pb-4 text-center print:pb-2"><h1 className="text-2xl font-bold print:text-xl">{profile.instituteName || "Learning Is Fun"}</h1><p className="mt-1 text-sm text-muted-foreground print:text-xs">Fee Payment Receipt</p><p className="mt-2 font-mono text-sm print:mt-1 print:text-xs">Receipt No. {payment.receiptNo}</p></div>

      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 print:grid-cols-2 print:gap-y-1.5"><div><p className="text-xs uppercase tracking-wide text-muted-foreground print:text-[9px]">Student</p><p className="font-semibold">{payment.studentName}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground print:text-[9px]">Academic Year</p><p className="font-semibold">{payment.academicYearName}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground print:text-[9px]">Payment Date</p><p className="font-semibold">{date.format(new Date(payment.paymentDate))}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground print:text-[9px]">Payment Mode</p><p className="font-semibold">{payment.paymentModeName}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground print:text-[9px]">Reference / Transaction</p><p className="font-semibold">{payment.referenceNo || "Not provided"}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground print:text-[9px]">Status</p><p className="font-semibold capitalize">{payment.status}</p></div></div>

      <div className="overflow-hidden rounded-xl border print:rounded-none">
        <div className="border-b bg-muted/30 px-4 py-2 print:px-2 print:py-1.5"><p className="font-semibold">Payment Breakdown</p></div>
        <table className="w-full border-collapse text-sm print:text-[10px]"><thead><tr className="border-b"><th className="px-4 py-2 text-left font-semibold print:px-2 print:py-1">Particulars</th><th className="px-4 py-2 text-right font-semibold print:px-2 print:py-1">Amount Paid</th></tr></thead><tbody>{payment.allocations.map((allocation, index)=><tr key={`${allocation.dueDate}-${allocation.feeHeadName}-${index}`} className="border-b last:border-b-0"><td className="px-4 py-2 print:px-2 print:py-1">{allocationLabel(allocation)}</td><td className="px-4 py-2 text-right font-medium print:px-2 print:py-1">{money.format(allocation.amount)}</td></tr>)}{payment.allocations.length===0?<tr><td className="px-4 py-3 text-muted-foreground print:px-2 print:py-1" colSpan={2}>No allocation details available for this historical receipt.</td></tr>:null}</tbody><tfoot><tr className="border-t-2"><td className="px-4 py-2 font-bold print:px-2 print:py-1">Total Amount Received</td><td className="px-4 py-2 text-right font-bold print:px-2 print:py-1">{money.format(payment.amount)}</td></tr></tfoot></table>
      </div>

      {payment.remarks?<div className="rounded-xl border px-4 py-2 text-sm print:px-2 print:py-1 print:text-[10px]"><strong>Remarks:</strong> {payment.remarks}</div>:null}
      {payment.status === "reversed" ? <div className="rounded-xl border p-3 text-sm print:p-2 print:text-[10px]"><strong>Reversed:</strong> {payment.reversalReason}</div> : null}
      <p className="text-center text-xs text-muted-foreground print:text-[9px]">Computer-generated receipt. Please retain it for your records.</p>
      <div className="flex flex-wrap justify-end gap-3 print:hidden"><Button nativeButton={false} variant="outline" render={<Link href={backHref} />}>Back to Fees</Button><PrintButton /></div>
    </CardContent></Card>
  </div>;
}

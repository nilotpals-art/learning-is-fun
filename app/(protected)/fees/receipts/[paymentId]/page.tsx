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

export default async function ReceiptPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const profile = await requireRole([...DASHBOARD_ROLES, "Student", "Parent"]);
  const { paymentId } = await params;
  const payment = (await listFeePayments(profile)).find((item) => item.id === paymentId);
  if (!payment) notFound();
  const backHref = profile.role === "Student" ? "/student/fees" : profile.role === "Parent" ? "/parent/fees" : "/fees/payments";

  return <div className="space-y-6">
    <PrintWatermark instituteName={profile.instituteName} />
    <div className="print:hidden"><PageHeader title={`Receipt ${payment.receiptNo}`} description="Official fee payment receipt" /></div>
    <Card className="mx-auto max-w-3xl print:border-0 print:shadow-none"><CardContent className="space-y-6 pt-6">
      <div className="border-b pb-5 text-center"><h1 className="text-2xl font-bold">{profile.instituteName || "Learning Is Fun"}</h1><p className="mt-1 text-sm text-muted-foreground">Fee Payment Receipt</p><p className="mt-3 font-mono text-sm">Receipt No. {payment.receiptNo}</p></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Student</p><p className="font-semibold">{payment.studentName}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Academic Year</p><p className="font-semibold">{payment.academicYearName}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Payment Date</p><p className="font-semibold">{date.format(new Date(payment.paymentDate))}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Payment Mode</p><p className="font-semibold">{payment.paymentModeName}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Reference / Transaction</p><p className="font-semibold">{payment.referenceNo || "Not provided"}</p></div><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p><p className="font-semibold capitalize">{payment.status}</p></div></div>
      <div className="rounded-2xl border p-5"><p className="text-sm text-muted-foreground">Amount Received</p><p className="mt-1 text-3xl font-bold">{money.format(payment.amount)}</p>{payment.remarks?<p className="mt-3 text-sm">Remarks: {payment.remarks}</p>:null}</div>
      {payment.status === "reversed" ? <div className="rounded-2xl border p-4 text-sm"><strong>Reversed:</strong> {payment.reversalReason}</div> : null}
      <p className="text-center text-xs text-muted-foreground">Computer-generated receipt. Please retain it for your records.</p>
      <div className="flex flex-wrap justify-end gap-3 print:hidden"><Button nativeButton={false} variant="outline" render={<Link href={backHref} />}>Back to Fees</Button><PrintButton /></div>
    </CardContent></Card>
  </div>;
}

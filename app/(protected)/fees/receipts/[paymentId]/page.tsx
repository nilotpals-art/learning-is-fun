import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listFeePayments } from "@/features/fees/services/fee-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function ReceiptPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const profile = await requireRole([...DASHBOARD_ROLES, "Student", "Parent"]);
  const { paymentId } = await params;
  const payment = (await listFeePayments(profile)).find((item) => item.id === paymentId);
  if (!payment) notFound();
  return (
    <div className="space-y-6">
      <PageHeader title={`Receipt ${payment.receiptNo}`} description="Institute-scoped payment receipt" />
      <Card className="mx-auto max-w-2xl"><CardContent className="space-y-3 pt-6">
        <p><strong>Student:</strong> {payment.studentName}</p><p><strong>Academic Year:</strong> {payment.academicYearName}</p>
        <p><strong>Amount:</strong> ₹{payment.amount.toFixed(2)}</p><p><strong>Payment Mode:</strong> {payment.paymentModeName}</p><p><strong>Status:</strong> {payment.status}</p>
        <Button nativeButton={false} render={<Link href={profile.role === "Student" ? "/student/fees" : profile.role === "Parent" ? "/parent/fees" : "/fees/payments"} />}>Back to Fees</Button>
      </CardContent></Card>
    </div>
  );
}

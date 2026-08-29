import { NextResponse } from "next/server";

import { deliverPaymentConfirmationImmediately } from "@/features/fees/services/fee-worker-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) {
    return NextResponse.json({ ok: false, error: "institute_not_found" }, { status: 403 });
  }

  let body: { paymentId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  if (!body.paymentId) {
    return NextResponse.json({ ok: false, error: "payment_id_required" }, { status: 400 });
  }

  try {
    const result = await deliverPaymentConfirmationImmediately(body.paymentId, profile.instituteId);
    return NextResponse.json({ ok: result.sent > 0, ...result });
  } catch (error) {
    console.error("Immediate fee WhatsApp confirmation failed", error);
    return NextResponse.json({ ok: false, error: "whatsapp_delivery_failed" }, { status: 500 });
  }
}

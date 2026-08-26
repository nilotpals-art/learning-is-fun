"use server";

import type { FeeActionResult } from "@/features/fees/types/fees";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const deletePaymentSchema = z.object({
  paymentId: z.string().uuid(),
  receiptNo: z.string().trim().min(1).max(100),
});

function refreshFees() {
  ["/fees", "/fees/student-fees", "/fees/collect", "/fees/payments", "/fees/reports", "/fees/messages", "/student/fees", "/parent/fees", "/dashboard"].forEach((path) => revalidatePath(path));
}

export async function deleteFeePayment(input: unknown): Promise<FeeActionResult> {
  const parsed = deletePaymentSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Enter the receipt number exactly to confirm permanent deletion." };

  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) redirect("/unauthorized");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("delete_fee_payment", {
    p_payment_id: parsed.data.paymentId,
    p_confirmation_receipt_no: parsed.data.receiptNo,
  });

  if (error) {
    const message = String(error.message ?? "");
    if (message.includes("FEES_DELETE_CONFIRMATION_INVALID")) return { status: "error", message: "Receipt number did not match. Payment was not deleted." };
    if (message.includes("FEES_PAYMENT_NOT_FOUND")) return { status: "error", message: "Payment was not found or has already been deleted." };
    if (message.includes("SECURITY_DEPOSIT_PAYMENT_IN_USE")) return { status: "error", message: "This Security Deposit payment cannot be deleted because part of that deposit has already been adjusted or refunded. Undo those entries first." };
    if (message.includes("FEES_UNAUTHORIZED")) return { status: "error", message: "You are not authorised to delete fee payments." };
    return { status: "error", message: "The payment could not be deleted. Please try again." };
  }

  const result = data as { receiptNo?: string } | null;
  refreshFees();
  return { status: "success", message: `Payment ${result?.receiptNo ?? parsed.data.receiptNo} permanently deleted. Its fee allocations were removed and pending balances recalculated.` };
}

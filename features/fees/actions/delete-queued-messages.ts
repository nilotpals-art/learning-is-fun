"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export async function deleteQueuedFeeMessagesForStudent(studentId: string) {
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) return { status: "error" as const, message: "Institute not found." };
  if (!studentId) return { status: "error" as const, message: "Select a student first." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("delete_queued_fee_messages_for_student", { p_student_id: studentId });
  if (error) {
    console.error("Delete queued fee messages failed", { code: error.code });
    return { status: "error" as const, message: "Queued messages could not be deleted." };
  }

  const count = Number(data ?? 0);
  revalidatePath("/fees/messages");
  return {
    status: "success" as const,
    message: count > 0 ? `${count} queued message${count === 1 ? "" : "s"} deleted.` : "No queued messages found for this student.",
  };
}

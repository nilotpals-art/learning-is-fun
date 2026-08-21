"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/services/auth-service";
import { createClient } from "@/lib/supabase/server";
import { parentProfileSchema } from "@/features/parent/validations/parent-profile-schema";

export type ParentProfileActionState = { status: "idle" | "success" | "error"; message: string; fieldErrors?: Record<string, string[] | undefined> };

export async function updateParentProfile(_: ParentProfileActionState, formData: FormData): Promise<ParentProfileActionState> {
  await requireRole(["Parent"]);
  const parsed = parentProfileSchema.safeParse({ mobile: formData.get("mobile"), email: formData.get("email") });
  if (!parsed.success) return { status: "error", message: "Please correct the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_own_parent_contact", { p_mobile: parsed.data.mobile, p_email: parsed.data.email });
  if (error) {
    const message = error.message.includes("PARENT_PROFILE_EMAIL_IN_USE") ? "That email address is already used by another parent." : "We could not update your profile. Please try again.";
    return { status: "error", message };
  }
  revalidatePath("/parent/profile");
  return { status: "success", message: "Contact details updated successfully." };
}

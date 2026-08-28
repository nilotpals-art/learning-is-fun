"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isAdministratorRole } from "@/lib/auth/roles";
import { requireAuth } from "@/lib/auth/services/auth-service";
import { createClient } from "@/lib/supabase/server";

const noticeSchema = z.object({
  title: z.string().trim().min(1).max(160),
  message: z.string().trim().min(1).max(3000),
  targetAudience: z.enum(["Student", "Parent", "Both"]),
  startAt: z.string().min(1),
  endAt: z.string().optional(),
  mustAcknowledge: z.boolean(),
});

function toIso(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
  return date.toISOString();
}

export async function createUrgentNoticeAction(formData: FormData) {
  const profile = await requireAuth();
  if (!isAdministratorRole(profile.role) || !profile.instituteId) return;
  const parsed = noticeSchema.safeParse({
    title: formData.get("title"),
    message: formData.get("message"),
    targetAudience: formData.get("targetAudience"),
    startAt: formData.get("startAt"),
    endAt: String(formData.get("endAt") ?? "").trim() || undefined,
    mustAcknowledge: formData.get("mustAcknowledge") === "on",
  });
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase.from("urgent_notices").insert({
    institute_id: profile.instituteId,
    title: parsed.data.title,
    message: parsed.data.message,
    target_audience: parsed.data.targetAudience,
    start_at: toIso(parsed.data.startAt),
    end_at: parsed.data.endAt ? toIso(parsed.data.endAt) : null,
    must_acknowledge: parsed.data.mustAcknowledge,
    is_active: true,
    created_by: profile.id,
  });
  revalidatePath("/learning-planner/notifications");
}

export async function updateUrgentNoticeAction(formData: FormData) {
  const profile = await requireAuth();
  if (!isAdministratorRole(profile.role) || !profile.instituteId) return;
  const id = z.string().uuid().safeParse(formData.get("id"));
  const parsed = noticeSchema.safeParse({
    title: formData.get("title"),
    message: formData.get("message"),
    targetAudience: formData.get("targetAudience"),
    startAt: formData.get("startAt"),
    endAt: String(formData.get("endAt") ?? "").trim() || undefined,
    mustAcknowledge: formData.get("mustAcknowledge") === "on",
  });
  if (!id.success || !parsed.success) return;
  const supabase = await createClient();
  await supabase.from("urgent_notices").update({
    title: parsed.data.title,
    message: parsed.data.message,
    target_audience: parsed.data.targetAudience,
    start_at: toIso(parsed.data.startAt),
    end_at: parsed.data.endAt ? toIso(parsed.data.endAt) : null,
    must_acknowledge: parsed.data.mustAcknowledge,
    updated_at: new Date().toISOString(),
  }).eq("id", id.data).eq("institute_id", profile.instituteId);
  revalidatePath("/learning-planner/notifications");
}

export async function toggleUrgentNoticeAction(formData: FormData) {
  const profile = await requireAuth();
  if (!isAdministratorRole(profile.role) || !profile.instituteId) return;
  const id = z.string().uuid().safeParse(formData.get("id"));
  const active = formData.get("active") === "true";
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("urgent_notices").update({ is_active: active, updated_at: new Date().toISOString() }).eq("id", id.data).eq("institute_id", profile.instituteId);
  revalidatePath("/learning-planner/notifications");
}

export async function deleteUrgentNoticeAction(formData: FormData) {
  const profile = await requireAuth();
  if (!isAdministratorRole(profile.role) || !profile.instituteId) return;
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("urgent_notices").delete().eq("id", id.data).eq("institute_id", profile.instituteId);
  revalidatePath("/learning-planner/notifications");
}

export async function acknowledgeUrgentNoticeAction(noticeId: string) {
  const profile = await requireAuth();
  if (profile.role !== "Student" && profile.role !== "Parent") return;
  const id = z.string().uuid().safeParse(noticeId);
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("urgent_notice_acknowledgements").upsert({ notice_id: id.data, user_id: profile.id }, { onConflict: "notice_id,user_id" });
  revalidatePath("/student/dashboard");
  revalidatePath("/parent/dashboard");
}

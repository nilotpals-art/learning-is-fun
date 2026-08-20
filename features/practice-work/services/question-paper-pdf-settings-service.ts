import "server-only";

import type { AuthProfile } from "@/features/auth/types/auth";
import { createClient } from "@/lib/supabase/server";

export type QuestionPaperPdfSettings = {
  headerMode: "text" | "image" | "none";
  headerTitle: string;
  headerSubtitle: string;
  headerContact: string;
  headerImageUrl: string;
  watermarkMode: "text" | "image" | "none";
  watermarkText: string;
  watermarkImageUrl: string;
  watermarkOpacity: number;
  watermarkRotation: number;
  watermarkSize: number;
  footerText: string;
  showPageNumbers: boolean;
  repeatHeader: boolean;
  pageMargin: number;
};

function institute(profile: AuthProfile) {
  if (!profile.instituteId) throw new Error("PRACTICE_UNAUTHORIZED");
  return profile.instituteId;
}

export async function getQuestionPaperPdfSettings(profile: AuthProfile): Promise<QuestionPaperPdfSettings> {
  const s = await createClient();
  const id = institute(profile);
  const [{ data: row, error }, { data: inst }] = await Promise.all([
    s.from("question_paper_pdf_settings").select("header_mode,header_title,header_subtitle,header_contact,header_image_url,watermark_mode,watermark_text,watermark_image_url,watermark_opacity,watermark_rotation,watermark_size,footer_text,show_page_numbers,repeat_header,page_margin").eq("institute_id", id).maybeSingle(),
    s.from("institutes").select("name,address,email,phone").eq("id", id).maybeSingle(),
  ]);
  if (error) throw error;
  const instituteName = inst?.name ?? "LEARNING IS FUN";
  const contact = [inst?.address, inst?.phone, inst?.email].filter(Boolean).join(" | ");
  return {
    headerMode: (row?.header_mode ?? "text") as QuestionPaperPdfSettings["headerMode"],
    headerTitle: row?.header_title ?? instituteName,
    headerSubtitle: row?.header_subtitle ?? "English Remedial Classes",
    headerContact: row?.header_contact ?? contact,
    headerImageUrl: row?.header_image_url ?? "",
    watermarkMode: (row?.watermark_mode ?? "text") as QuestionPaperPdfSettings["watermarkMode"],
    watermarkText: row?.watermark_text ?? instituteName,
    watermarkImageUrl: row?.watermark_image_url ?? "",
    watermarkOpacity: Number(row?.watermark_opacity ?? 0.18),
    watermarkRotation: Number(row?.watermark_rotation ?? 35),
    watermarkSize: Number(row?.watermark_size ?? 48),
    footerText: row?.footer_text ?? "",
    showPageNumbers: row?.show_page_numbers ?? true,
    repeatHeader: row?.repeat_header ?? true,
    pageMargin: Number(row?.page_margin ?? 48),
  };
}

export async function saveQuestionPaperPdfSettings(profile: AuthProfile, input: QuestionPaperPdfSettings) {
  const s = await createClient();
  const id = institute(profile);
  const { error } = await s.from("question_paper_pdf_settings").upsert({
    institute_id: id,
    header_mode: input.headerMode,
    header_title: input.headerTitle.trim() || null,
    header_subtitle: input.headerSubtitle.trim() || null,
    header_contact: input.headerContact.trim() || null,
    header_image_url: input.headerImageUrl.trim() || null,
    watermark_mode: input.watermarkMode,
    watermark_text: input.watermarkText.trim() || "LEARNING IS FUN",
    watermark_image_url: input.watermarkImageUrl.trim() || null,
    watermark_opacity: input.watermarkOpacity,
    watermark_rotation: input.watermarkRotation,
    watermark_size: input.watermarkSize,
    footer_text: input.footerText.trim() || null,
    show_page_numbers: input.showPageNumbers,
    repeat_header: input.repeatHeader,
    page_margin: input.pageMargin,
    updated_by: profile.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: "institute_id" });
  if (error) throw error;
}

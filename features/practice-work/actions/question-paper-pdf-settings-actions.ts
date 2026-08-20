"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { saveQuestionPaperPdfSettings } from "@/features/practice-work/services/question-paper-pdf-settings-service";
import type { PracticeActionResult } from "@/features/practice-work/types/practice-work";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

const schema = z.object({
  headerMode: z.enum(["text", "image", "none"]),
  headerTitle: z.string().max(180),
  headerSubtitle: z.string().max(180),
  headerContact: z.string().max(400),
  headerImageUrl: z.string().max(1000),
  watermarkMode: z.enum(["text", "image", "none"]),
  watermarkText: z.string().max(180),
  watermarkImageUrl: z.string().max(1000),
  watermarkOpacity: z.coerce.number().min(0).max(1),
  watermarkRotation: z.coerce.number().min(-180).max(180),
  watermarkSize: z.coerce.number().min(8).max(180),
  footerText: z.string().max(300),
  showPageNumbers: z.boolean(),
  repeatHeader: z.boolean(),
  pageMargin: z.coerce.number().min(18).max(100),
});

export async function saveQuestionPaperPdfSettingsAction(input: unknown): Promise<PracticeActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Correct the PDF settings before saving." };
  try {
    const profile = await requireRole(DASHBOARD_ROLES);
    await saveQuestionPaperPdfSettings(profile, parsed.data);
    revalidatePath("/practice-work/papers/settings");
    return { status: "success", message: "Question paper PDF settings saved." };
  } catch {
    return { status: "error", message: "PDF settings could not be saved." };
  }
}

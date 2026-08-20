"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { combineQuestionPapers, createQuestionPaper, updateDraftQuestionPaper } from "@/features/practice-work/services/question-paper-service";
import type { PracticeActionResult } from "@/features/practice-work/types/practice-work";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

const createSchema = z.object({
  academicYearId: z.string().uuid(),
  questionIds: z.array(z.string().uuid()).min(1),
  paperType: z.string().trim().min(2).max(80),
  instructions: z.string().trim().max(2000).optional(),
});

const combineSchema = z.object({
  sourcePaperIds: z.array(z.string().uuid()).min(2).max(3),
  paperType: z.string().trim().min(2).max(80),
});

const updateSchema = z.object({
  paperId: z.string().uuid(),
  title: z.string().trim().min(2).max(180),
  instructions: z.string().trim().max(2000).optional(),
  questions: z.array(z.object({
    id: z.string().uuid(),
    questionText: z.string().trim().min(1).max(5000),
    marks: z.coerce.number().min(0.25).max(100),
    displayOrder: z.coerce.number().int().min(1),
  })).min(1),
});

function refresh() {
  ["/practice-work", "/practice-work/papers", "/practice-work/sets", "/practice-work/assignments", "/practice-work/my-work"].forEach((path) => revalidatePath(path));
}

export async function createQuestionPaperAction(input: unknown): Promise<PracticeActionResult<{ id: string }>> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Select questions and complete the paper details." };
  try {
    const profile = await requireRole(DASHBOARD_ROLES);
    const id = await createQuestionPaper(profile, parsed.data);
    refresh();
    return { status: "success", message: "Draft question paper created.", data: { id } };
  } catch {
    return { status: "error", message: "The question paper could not be created." };
  }
}

export async function combineQuestionPapersAction(input: unknown): Promise<PracticeActionResult<{ id: string }>> {
  const parsed = combineSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Select 2 or 3 papers to combine." };
  try {
    const profile = await requireRole(DASHBOARD_ROLES);
    const id = await combineQuestionPapers(profile, parsed.data);
    refresh();
    return { status: "success", message: "Combined draft paper created. Duplicate questions were removed.", data: { id } };
  } catch {
    return { status: "error", message: "The selected papers could not be combined." };
  }
}

export async function updateQuestionPaperAction(input: unknown): Promise<PracticeActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Correct the paper fields before saving." };
  try {
    const profile = await requireRole(DASHBOARD_ROLES);
    await updateDraftQuestionPaper(profile, parsed.data);
    refresh();
    revalidatePath(`/practice-work/papers/${parsed.data.paperId}`);
    return { status: "success", message: "Question paper saved." };
  } catch {
    return { status: "error", message: "Only draft papers can be edited." };
  }
}

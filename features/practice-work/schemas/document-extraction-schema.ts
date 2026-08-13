import { z } from "zod";
import { DIFFICULTIES, QUESTION_TYPES } from "@/features/practice-work/types/practice-work";

export const providerExtractionSchema = z.object({
  questions: z.array(z.object({
    questionNumber: z.string().trim().max(50).nullable(),
    questionText: z.string().trim().min(3).max(5000),
    questionType: z.enum(QUESTION_TYPES),
    options: z.array(z.string().trim().min(1).max(1000)).max(12).nullable(),
    proposedAnswer: z.string().trim().max(5000).nullable(),
    acceptedAnswers: z.array(z.string().trim().min(1).max(1000)).max(20).nullable(),
    proposedExplanation: z.string().trim().max(5000).nullable(),
    marks: z.number().positive().max(1000).nullable(),
    difficulty: z.enum(DIFFICULTIES),
    sourcePage: z.number().int().positive().nullable(),
    sourceReference: z.string().trim().max(300).nullable(),
    visualDependency: z.boolean(),
    visualDescription: z.string().trim().max(500).nullable(),
    warnings: z.array(z.string().trim().min(1).max(300)).max(10),
  })).min(1).max(100),
});

export type ProviderExtractionOutput = z.infer<typeof providerExtractionSchema>;

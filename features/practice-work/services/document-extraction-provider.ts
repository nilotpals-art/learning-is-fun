import "server-only";

import type { Difficulty, QuestionType } from "@/features/practice-work/types/practice-work";

export interface ProviderExtractionQuestion {
  questionText: string; questionType: QuestionType; options: string[] | null;
  correctAnswer: string | null; acceptedAnswers: string[] | null; explanation: string | null;
  suggestedMarks: number | null; difficulty: Difficulty; sourcePage: number | null;
  sourceReference: string | null; visualDependency: boolean; visualDescription: string | null;
  warnings: string[]; associatedImage?: Uint8Array; associatedImageMimeType?: "image/jpeg" | "image/png";
}
export interface DocumentExtractionProvider { readonly model: string; extractImageQuestions(input: { bytes: Uint8Array; mimeType: string; filename: string }): Promise<ProviderExtractionQuestion[]>; }

export async function getDocumentExtractionProvider(): Promise<DocumentExtractionProvider> {
  const { GeminiDocumentExtractionProvider } = await import("@/features/practice-work/services/gemini-document-extraction-provider");
  return new GeminiDocumentExtractionProvider();
}

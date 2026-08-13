import "server-only";

export interface ProviderExtractionQuestion {
  questionText: string;
  sourcePage?: number;
  sourceReference?: string;
  associatedImage?: Uint8Array;
  associatedImageMimeType?: "image/jpeg" | "image/png";
}

export interface DocumentExtractionProvider {
  extractImageQuestions(input: { bytes: Uint8Array; mimeType: string; filename: string }): Promise<ProviderExtractionQuestion[]>;
}

class DeferredGeminiDocumentExtractionProvider implements DocumentExtractionProvider {
  async extractImageQuestions(): Promise<ProviderExtractionQuestion[]> {
    throw new Error("DOCUMENT_EXTRACTION_PROVIDER_UNAVAILABLE");
  }
}

export function getDocumentExtractionProvider(): DocumentExtractionProvider {
  return new DeferredGeminiDocumentExtractionProvider();
}

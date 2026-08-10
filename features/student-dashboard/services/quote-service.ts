import "server-only";

import type { StudentQuote } from "@/features/student-dashboard/types/student-dashboard";

const QUOTE_ENDPOINT = "https://dummyjson.com/quotes/random";
const MAX_QUOTE_LENGTH = 220;
const FALLBACK_QUOTES: readonly Omit<StudentQuote, "source">[] = [
  { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B. B. King" },
  { text: "Reading is to the mind what exercise is to the body.", author: "Joseph Addison" },
  { text: "A word after a word after a word is power.", author: "Margaret Atwood" },
  { text: "Learning never exhausts the mind.", author: "Leonardo da Vinci" },
];

interface QuoteApiResponse {
  quote?: unknown;
  author?: unknown;
}

export function parseQuoteResponse(value: unknown): StudentQuote | null {
  if (!value || typeof value !== "object") return null;
  const { quote, author } = value as QuoteApiResponse;
  if (typeof quote !== "string" || typeof author !== "string") return null;

  const text = quote.trim();
  const attribution = author.trim();
  if (!text || !attribution || text.length > MAX_QUOTE_LENGTH) return null;
  if (/\b(politic|religion|war|violence|hate)\b/i.test(`${text} ${attribution}`)) return null;

  return { text, author: attribution, source: "external" };
}

function fallbackQuote(): StudentQuote {
  const index = Math.floor(Math.random() * FALLBACK_QUOTES.length);
  return { ...FALLBACK_QUOTES[index], source: "fallback" };
}

export async function getStudentQuote(): Promise<StudentQuote> {
  try {
    const response = await fetch(QUOTE_ENDPOINT, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) return fallbackQuote();
    return parseQuoteResponse(await response.json()) ?? fallbackQuote();
  } catch {
    return fallbackQuote();
  }
}

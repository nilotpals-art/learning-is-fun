import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_GEMINI_QUESTION_MODEL, GeminiQuestionGenerationProvider, type GeminiQuestionClient, validateGeneratedMarks } from "./gemini-question-generation-provider";

const valid = { questions: [{ questionType: "mcq", questionText: "Choose the noun.", options: ["Run", "Book"], acceptedAnswers: null, correctAnswer: "Book", explanation: "Book names a thing.", difficulty: "beginner", suggestedMarks: 5, tags: ["noun"] }] };
function client(value?: string, error?: unknown, onInput?: (input: unknown) => void): GeminiQuestionClient { return { models: { generateContent: async (input) => { onInput?.(input); if (error) throw error; return { text: value, candidates: [{ finishReason: "STOP" }] }; } } }; }

test("Gemini question generation returns independently validated structured output", async () => {
  let request: unknown;
  const provider = new GeminiQuestionGenerationProvider({ client: client(JSON.stringify(valid), undefined, (input) => { request = input; }), model: "test-model" });
  const output = await provider.generate({ sourceFullMarks: 5 });
  assert.equal(output.questions[0].correctAnswer, "Book");
  assert.equal(validateGeneratedMarks(output, 5), 5);
  assert.equal(provider.model, "test-model");
  const serializedRequest = JSON.stringify(request);
  assert.equal(serializedRequest.includes("exclusiveMinimum"), false);
  assert.equal(serializedRequest.includes('"minimum":0.25'), true);
  const captured = request as { model: string; contents: Array<{ role: string; parts: Array<{ text: string }> }>; config: Record<string, unknown> & { responseFormat: { text: { mimeType: string; schema: unknown } } } };
  assert.equal(captured.model, "test-model");
  assert.equal(captured.contents[0].role, "user");
  assert.equal(captured.config.responseFormat.text.mimeType, "application/json");
  assert.ok(captured.config.responseFormat.text.schema);
  assert.equal("responseMimeType" in captured.config, false);
  assert.equal("responseJsonSchema" in captured.config, false);
});

test("Gemini question generation uses the current default model", () => {
  const provider = new GeminiQuestionGenerationProvider({ client: client(JSON.stringify(valid)) });
  assert.equal(provider.model, "gemini-3.6-flash");
  assert.equal(DEFAULT_GEMINI_QUESTION_MODEL, "gemini-3.6-flash");
});

test("Gemini question generation rejects a mismatched Full Marks total", () => {
  assert.throws(() => validateGeneratedMarks(valid as never, 10), /GENERATED_MARKS_MISMATCH/);
});

test("Gemini question generation reports missing configuration", () => {
  const previous = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try { assert.throws(() => new GeminiQuestionGenerationProvider(), /GEMINI_GENERATION_NOT_CONFIGURED/); }
  finally { if (previous === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previous; }
});

test("Gemini question generation distinguishes empty, invalid JSON, and schema mismatch responses", async () => {
  for (const [value, code] of [[undefined, "GEMINI_GENERATION_EMPTY_RESPONSE"], ["not-json", "GEMINI_GENERATION_INVALID_JSON"], [JSON.stringify({ questions: [] }), "GEMINI_GENERATION_SCHEMA_MISMATCH"]] as const) {
    const provider = new GeminiQuestionGenerationProvider({ client: client(value) });
    await assert.rejects(() => provider.generate({}), new RegExp(code));
  }
});

test("Gemini question generation classifies provider HTTP failures", async () => {
  for (const [error, code] of [[Object.assign(new Error(JSON.stringify({ error: { code: 400, status: "INVALID_ARGUMENT", message: "Request rejected" } })), { status: 400 }), "GEMINI_GENERATION_REQUEST_REJECTED"], [{ status: 401 }, "GEMINI_GENERATION_AUTH_FAILED"], [{ status: 403 }, "GEMINI_GENERATION_PERMISSION_DENIED"], [{ status: 404 }, "GEMINI_GENERATION_MODEL_UNAVAILABLE"], [{ status: 429 }, "GEMINI_GENERATION_QUOTA_EXCEEDED"], [{ status: 500 }, "GEMINI_GENERATION_SERVICE_UNAVAILABLE"], [{ status: 503 }, "GEMINI_GENERATION_SERVICE_UNAVAILABLE"], [new Error("network"), "GEMINI_GENERATION_PROVIDER_UNAVAILABLE"]] as const) {
    const provider = new GeminiQuestionGenerationProvider({ client: client(undefined, error) });
    await assert.rejects(() => provider.generate({}), new RegExp(code));
  }
});

test("Gemini question generation classifies timeouts", async () => {
  const provider = new GeminiQuestionGenerationProvider({ timeoutMs: 1, client: { models: { generateContent: (input) => new Promise((_, reject) => { const signal=(input as {config:{abortSignal:AbortSignal}}).config.abortSignal;signal.addEventListener("abort",()=>reject(new Error("aborted")),{once:true}); }) } } });
  await assert.rejects(() => provider.generate({}), /GEMINI_GENERATION_TIMEOUT/);
});

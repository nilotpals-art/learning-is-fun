# Learning Is Fun ERP
## Codex Implementation Prompt
### Practice Work AI Provider Migration — OpenAI to Google Gemini

Replace the existing Module 07 AI question-generation provider from OpenAI to Google Gemini while preserving all existing Practice Work behavior.

Do not start Examinations. Do not change Attendance, Learning Planner, Fees, Student Dashboard, or unrelated business logic. Preserve all current uncommitted work. Do not commit or push unless explicitly instructed.

## Primary goal

Migrate only the AI provider/runtime layer used by Practice Work question generation.

The following existing behavior must remain unchanged:

- Question Templates
- optional Board / Class / Book / Chapter context
- Skill / Topic / Subtopic context
- Special Instructions for AI
- question count
- difficulty
- answers
- explanations
- duplicate detection
- AI suggested marks
- Administrator review/approval
- Question Bank persistence
- Practice Sets
- assignments
- Student attempts
- scoring
- retry incorrect questions
- analytics
- answer-key security

## Repository inspection first

Before editing:

1. Inspect the entire current Module 07 AI generation implementation.
2. Locate all OpenAI imports, services, environment-variable reads, model names, error mapping, structured-output validation, generation history writes, tests, package dependencies, and documentation.
3. Confirm whether any code outside Practice Work uses the `openai` package.
4. Preserve the existing database schema unless a provider-neutral metadata adjustment is genuinely required.
5. Do not delete the OpenAI implementation until Gemini generation has been implemented and verified.

## Gemini SDK

Use the current official Google Gemini JavaScript/TypeScript SDK:

`@google/genai`

Install it through npm and keep it server-only.

Use a server-side environment variable:

`GEMINI_API_KEY`

Never expose the key to Client Components, browser bundles, logs, database rows, generated errors, or Git.

`.env.local` must remain ignored and untracked.

Do not print the key during diagnostics.

## Provider architecture

Prefer a provider-neutral internal interface instead of coupling Practice Work directly to Gemini-specific types.

Recommended shape:

```ts
interface QuestionGenerationProvider {
  generateQuestions(input: QuestionGenerationInput): Promise<GeneratedQuestionBatch>;
}
```

Then implement Gemini behind that boundary.

Keep generation orchestration, prompt construction, validation, duplicate checks, persistence, and review workflow outside the provider where possible.

This should make future provider changes possible without rewriting Module 07.

## Structured output

Do not accept arbitrary free-form model text.

Gemini output must be constrained to the existing validated question schema and parsed server-side.

Use the project's existing Zod/domain validation as the final authority.

Every generated item must continue to validate fields such as:

- question type
- question text
- options where applicable
- correct answer
- accepted answers where applicable
- explanation
- difficulty
- suggested marks
- tags if supported

Reject malformed/incomplete output safely.

Do not save malformed Gemini responses into Question Bank.

## Prompt/context behavior

Preserve the current functional prompt semantics.

Generation must continue to support:

- Board optional
- Class optional
- Book Name optional
- Chapter optional
- Skill / Topic / Subtopic
- selected Question Template
- difficulty
- number of questions
- Special Instructions for AI
- include answers
- include explanations
- avoid duplicates
- simple-language preference

Book/chapter names alone are references, not proof that the model has exact textbook content.

If supplied chapter text/content is supported by the current workflow, keep the distinction between grounded chapter generation and reference-only generation.

## Model configuration

Do not hard-code Gemini configuration in multiple files.

Use one server-side model configuration location.

Choose a generally available Gemini model appropriate for structured text generation after checking the installed SDK/current API behavior during implementation.

Persist the actual model identifier in AI generation history just as the current implementation stores model metadata.

Provider/model names should be explicit enough that historical generations remain auditable.

## Error handling

Map Gemini/provider errors into safe application errors.

Do not expose raw provider payloads, headers, API keys, stack traces, or sensitive request data to the UI.

Handle at minimum:

- missing API key
- authentication/invalid key
- quota/rate limit
- billing/quota exhaustion where applicable
- malformed structured output
- provider timeout/network failure
- safety/provider refusal
- unexpected provider response

Generation failure must not corrupt existing Question Bank or approved Practice Work data.

## Timeout and retries

Use a sensible server-side timeout.

Do not implement uncontrolled automatic retries that can duplicate generation records or create unexpected cost.

If retry is used, it must be bounded and idempotent at the application workflow level.

## OpenAI removal rules

After Gemini generation works and verification passes:

1. Search the complete repository for `openai`, `OPENAI_API_KEY`, OpenAI-specific services, imports, and model names.
2. If no other feature depends on the `openai` npm package, remove it from `package.json` and update `package-lock.json`.
3. Remove obsolete OpenAI-only runtime files/imports.
4. Do not delete historical database generation rows merely because their provider/model was OpenAI.
5. Do not delete the user's old `OPENAI_API_KEY` from their local environment unless explicitly requested; simply stop depending on it.
6. Do not commit any environment file.

## Environment behavior

If `GEMINI_API_KEY` is not configured, the application should fail generation gracefully with a clear safe message such as Gemini API not configured.

The rest of Practice Work must continue to work without Gemini credentials.

Question Bank browsing, manual question management, Practice Sets, assignments, attempts, scoring, analytics, and review history must not depend on the Gemini API being online.

## Database/history compatibility

Preserve existing AI generation history.

If the current generation-history table contains only a generic `model` field, keep using it unless a provider field is clearly needed.

If adding a provider field is necessary for audit clarity, use a targeted backward-compatible migration and backfill historical OpenAI records safely. Do not make a schema change solely for cosmetic reasons.

## UI behavior

The existing Generate Questions page should continue to look and behave the same unless provider-specific wording is currently visible.

Replace user-visible OpenAI branding with provider-neutral wording such as:

- Generate with AI
- AI Question Generator

Only mention Gemini where useful in Settings/status/diagnostics.

Do not force Administrators to know provider implementation details during ordinary question generation.

## Security

- `GEMINI_API_KEY` server-only.
- No Client Component API calls directly to Gemini.
- No browser-exposed provider credentials.
- No key storage in Supabase.
- No provider response logging containing sensitive prompt/student data unless intentionally sanitized.
- Preserve all existing Practice Work RLS and answer-key controls.

## Verification

Run:

```powershell
npm.cmd run lint
npx.cmd tsc --noEmit
npm.cmd run build
git diff --check
```

Also run the existing Module 07 non-AI tests to confirm the provider migration did not regress Practice Work behavior.

## Gemini smoke tests

If a usable `GEMINI_API_KEY` exists, perform small live smoke tests only.

Start with 5 questions.

Test separately:

1. generic topic-based generation
2. Board/Class context
3. optional Book/Chapter context
4. Special Instructions
5. answers + explanations
6. marks/suggested marks
7. structured output validation
8. generation history/model metadata
9. Administrator review and approval into Question Bank
10. duplicate handling

Do not generate large batches merely for testing.

If the key is unavailable or quota blocks requests, report live provider verification as deferred and do not mock production success.

## Required final report

Report:

1. Existing OpenAI files/dependencies found.
2. Gemini files/dependencies added.
3. Provider abstraction used.
4. `GEMINI_API_KEY` handling.
5. Gemini model used.
6. Structured-output method.
7. Validation behavior.
8. Error mapping.
9. OpenAI runtime code/package removed or intentionally retained, with reason.
10. Database changes, if any.
11. Live 5-question smoke-test result.
12. Module 07 regression-test results.
13. Lint result.
14. TypeScript result.
15. Build result.
16. `git diff --check` result.
17. `git status -sb`.
18. Confirmation no secret was committed or exposed.

Do not commit or push.

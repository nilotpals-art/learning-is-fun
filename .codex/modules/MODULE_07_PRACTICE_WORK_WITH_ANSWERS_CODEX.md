# Learning Is Fun ERP
## Codex Implementation Prompt
### Module 07 — Practice Work with Answers

Implement **Module 07 — Practice Work with Answers** in the existing `learning-is-fun` repository.

Do not redesign unrelated modules. Preserve all current uncommitted Module 06A/06B work. Do not modify completed Attendance behavior. Do not commit or push unless explicitly instructed.

## Existing architecture to reuse

- Next.js App Router
- TypeScript
- Supabase PostgreSQL + Supabase SSR
- Server Actions
- Zod
- Tailwind CSS + existing UI components
- TanStack Table
- Existing institute/branch/academic-year scoping
- Existing authenticated profile + role authorization
- Existing Learning Planner with `schedule_events`
- Existing Student assignments via `student_assignments`
- Existing Student/Parent linkage via `student_parent_links`

## Product intent

Practice Work replaces traditional Homework.

The module must support a complete remedial-learning loop:

```text
Question Bank
→ Practice Set
→ Assignment
→ Student Attempt
→ Submit
→ Answers + Explanations
→ Self-Correction
→ Retry Incorrect Questions
→ Improvement Analytics
```

The module must support both manually authored and AI-generated questions.

---

# 1. AI question generation requirements

Integrate with the **OpenAI API** from server-side code only.

Never expose the OpenAI API key to the browser.

Use the official OpenAI JavaScript/TypeScript SDK and the Responses API. Use Structured Outputs / JSON Schema where supported so generated question data is machine-valid before application parsing.

Store the API key only in a server-side environment variable such as:

```text
OPENAI_API_KEY
```

Do not place it in `NEXT_PUBLIC_*` variables.

Do not hardcode a specific model if the repository already has an AI model configuration convention. Otherwise introduce one server-only configurable model constant/environment variable and document it.

Every AI response must be validated by Zod before it reaches the review UI or database.

AI must NEVER directly insert approved Question Bank records. Generated content must first go through Administrator review.

---

# 2. AI generator form

Create an Administrator form under:

```text
Practice Work
→ Question Bank
→ Generate with AI
```

Support these fields.

## Academic context

All of the following should be optional unless existing repository UX strongly requires otherwise:

```text
Board
Class
Book Name
Chapter
```

`Book Name` and `Chapter` are optional free-text fields in Module 07.

Do not require a Textbook Master before AI generation.

If Board/Class are omitted, generation should still work as general English-remedial content.

## Learning context

Support:

```text
Skill
Topic
Subtopic
Difficulty
```

Recommended Skill values initially:

```text
grammar
vocabulary
reading
writing
spelling
comprehension
sentence_formation
revision
```

Difficulty values:

```text
beginner
intermediate
advanced
```

## Template

Administrator selects a reusable Question Template.

## Number of questions

Required positive integer with a safe application maximum. Use a sensible interactive limit such as 30 unless repository/product constraints justify another value.

## Special Instructions for AI

Add an optional multi-line field:

```text
Special Instructions for AI
```

Examples the system should support:

- Use simple vocabulary suitable for weak learners.
- Focus on irregular verbs.
- Include more inference questions.
- Make questions similar to board-exam style.
- Avoid repeated examples.
- Use real-life situations.
- Include exactly five error-correction questions.

Treat this as user-controlled instructional context, but it must not override structural validation, safety rules, required output schema, or system-level generation requirements.

Store the exact instruction with the generation-history record.

## Generation options

Support toggles/configuration such as:

```text
Include answers
Include explanations
Avoid duplicates
Keep language simple
```

Answers and explanations should be enabled by default for Practice Work.

---

# 3. Optional book/chapter behavior

Book Name and Chapter must be optional.

Generation modes should behave as follows:

```text
No book + no chapter
→ General contextual generation using other selected criteria.

Book only
→ Use the book name only as contextual guidance; do not claim exact source fidelity.

Book + chapter
→ Use both as contextual guidance; do not claim exact textbook grounding unless actual source content is supplied in a future module.
```

Do not scrape copyrighted textbook content from the internet.

Do not represent generated questions as verified textbook-exact merely because a Book Name and Chapter were typed.

Store optional source-context fields on generations/questions so they can be filtered later.

---

# 4. Question Templates

Create reusable template management.

Recommended initial templates:

```text
Grammar MCQ
Fill in the Blank
True / False
Sentence Correction
Rearrange Words
Short Answer
Vocabulary — Synonym
Vocabulary — Antonym
Vocabulary in Context
Reading Comprehension
Comprehension MCQ
Cause and Effect
Sequence of Events
Mixed Practice
```

Each template should define at minimum:

```text
id
institute_id
name
question_type
instructions
system_rules / prompt_rules
supports_options
requires_explanation
is_active
created_by
created_at
updated_at
```

Use repository naming/style conventions.

Templates must be institute-scoped.

Allow Administrator to create/edit/deactivate custom templates.

Do not let Students or Parents modify templates.

---

# 5. Question Bank

Create a reusable administrative Question Bank.

Recommended table:

```text
question_bank
```

Required logical fields:

```text
id uuid primary key
institute_id uuid not null

board_id uuid null
class_id uuid null

book_name text null
chapter text null

skill text null
topic text null
subtopic text null

template_id uuid null
question_type text not null

question_text text not null
options jsonb null
correct_answer jsonb/text not null
answer_explanation text null

difficulty text not null
suggested_marks numeric null

source_type text not null
ai_generation_id uuid null

is_active boolean not null default true

created_by uuid not null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Recommended `source_type`:

```text
manual
ai
```

Question Bank is administrative only.

Students must not browse the raw Question Bank or correct-answer fields.

---

# 6. Question types

Initial supported auto/self-correctable types:

```text
mcq
fill_blank
true_false
sentence_correction
rearrange_words
short_answer
reading_comprehension
```

Use canonical machine values.

For `short_answer`, support controlled accepted answers rather than pretending subjective prose can always be automatically scored correctly.

For reading comprehension, design a parent passage/question grouping cleanly. Do not duplicate long passage text into every child question if a normalized passage model is clearly better.

Do not implement subjective AI grading of essays in this module unless it is explicitly scoped later.

---

# 7. AI generation history

Create a table similar to:

```text
ai_question_generations
```

Store:

```text
id
institute_id
board_id nullable
class_id nullable
book_name nullable
chapter nullable
skill nullable
topic nullable
subtopic nullable
template_id
question_count_requested
difficulty
custom_instruction nullable
include_answers
include_explanations
model
status
generated_count
approved_count
rejected_count
created_by
created_at
```

Generation statuses may include:

```text
pending
completed
failed
reviewed
```

Store enough metadata for audit and troubleshooting, but do not unnecessarily persist sensitive API internals.

---

# 8. AI review/approval workflow

Required flow:

```text
Generate
→ Preview
→ Review each question
→ Edit / Approve / Reject / Regenerate
→ Save approved questions to Question Bank
```

Generated content must NOT automatically become active Question Bank content.

Preview each question with:

- question text
- options if any
- correct answer
- explanation
- difficulty
- suggested marks
- academic context

Actions:

```text
Approve
Edit
Reject
Regenerate
Approve Selected
```

Administrator edits must be validated before saving.

---

# 9. Duplicate detection

Before approving AI-generated questions, perform duplicate/similarity checks against the institute Question Bank.

At minimum implement normalized exact/near-exact duplicate detection.

If semantic similarity would significantly expand Module 07 scope, do not block implementation on embeddings. Instead:

- normalize case/whitespace/punctuation;
- compare normalized question text;
- flag obvious duplicates;
- structure the service so semantic similarity can be added later.

Do not silently reject; surface a warning and allow Administrator override if appropriate.

---

# 10. Practice Sets

Create:

```text
practice_sets
```

Recommended logical fields:

```text
id uuid primary key
institute_id uuid not null
academic_year_id uuid not null

board_id uuid null
class_id uuid null

book_name text null
chapter text null

skill text null
topic text null
subtopic text null

schedule_event_id uuid null

title text not null
description text null
instructions text null

difficulty text null
answer_mode text not null
allow_retry boolean not null default true
max_attempts integer null

marks_mode text not null
default_marks numeric null
target_total_marks numeric null

status text not null default 'draft'

created_by uuid not null
published_at timestamptz null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Statuses:

```text
draft
published
closed
archived
```

Answer modes:

```text
after_each_question
after_completion
```

Default to `after_completion` for remedial learning unless user explicitly changes it.

---

# 11. Practice Set Question Snapshots

Do not render historical Practice Sets directly from mutable live Question Bank rows.

Create:

```text
practice_set_questions
```

This table must snapshot the exact assigned version of each question.

Recommended fields:

```text
id
institute_id
practice_set_id
question_bank_id nullable

question_type
question_text
options
correct_answer
answer_explanation

difficulty
marks

display_order
created_at
```

Once a Practice Set is published, editing the Question Bank must not alter the published set's question text, answers, explanations, or marks.

---

# 12. Marks-per-question requirements

Practice Work must support marks per question.

Provide three marks modes when creating/reviewing a Practice Set:

```text
same_for_all
custom
ai_suggested
```

## Same for all

Administrator enters:

```text
Default Marks per Question
```

Every practice-set question receives that mark value unless manually overridden before publish.

## Custom

Administrator can edit marks per question in the review/order screen.

Example:

```text
MCQ                1
Fill Blank         1
Sentence Correction 2
Short Answer       3
```

## AI suggested

AI output may include a suggested mark based on type/difficulty.

Suggested marks are never blindly trusted. Administrator can edit them before approval/publish.

## Target total marks

Add optional:

```text
Target Total Marks
```

If present, validate whether selected question marks match the target and surface a warning/error based on UX design.

Practice Set must calculate:

```text
question_count
total_marks
```

from snapshot rows, not from Question Bank defaults.

No negative marking in Module 07 unless explicitly added later.

---

# 13. Practice Set creation workflow

Administrator can create a Practice Set using either:

```text
Select Existing Questions
Generate New Questions with AI
```

If AI generation is launched while creating a Practice Set:

```text
Generate
→ Review
→ Approve
→ save approved questions to Question Bank
→ snapshot selected questions into Practice Set
```

Allow question reorder before publish.

Do not require every Practice Set to save AI-generated questions if existing architecture allows one-off questions cleanly, but preferred behavior is to retain approved reusable questions in the Question Bank.

---

# 14. Practice assignments

Create:

```text
practice_assignments
```

Support assignment to:

- entire Batch
- selected Students

Recommended fields:

```text
id
institute_id
practice_set_id
batch_id nullable
student_id
schedule_event_id nullable
assigned_at
available_from nullable
due_at nullable
status
created_by
created_at
```

Avoid ambiguous many-recipient rows. Prefer one student-resolved assignment row per student after batch recipient resolution so individual progress is trackable.

Use date-valid `student_assignments` to resolve Batch membership.

Prevent duplicate assignment of the same practice set to the same student for the same logical assignment operation where appropriate.

---

# 15. Learning Planner integration

Practice Work may optionally link to:

```text
schedule_event_id
```

Administrator should be able to create/assign Practice Work from a completed or selected Learning Planner event.

Do not rewrite Learning Planner lifecycle behavior.

Do not require schedule linkage for generic Practice Work.

---

# 16. Student attempts

Create a clean attempt model.

Recommended tables:

```text
practice_attempts
practice_attempt_answers
```

`practice_attempts` logical fields:

```text
id
institute_id
practice_assignment_id
student_id
attempt_no
started_at
submitted_at
status
score_obtained
max_marks
percentage
is_retry
parent_attempt_id nullable
created_at
```

Statuses:

```text
in_progress
submitted
reviewed
```

`practice_attempt_answers` logical fields:

```text
id
institute_id
practice_attempt_id
practice_set_question_id
student_answer
is_correct
marks_awarded
answered_at
```

Do not expose correct answers to the Student before the configured answer mode allows it.

---

# 17. Self-correction workflow

Default recommended behavior:

```text
Attempt all questions
→ Submit Practice
→ Score
→ Show Correct / Incorrect
→ Show Correct Answer
→ Show Explanation
→ Review Mistakes
→ Retry Incorrect Questions
```

For each reviewed question display:

```text
Your Answer
Correct Answer
Correct / Incorrect
Explanation
Marks Awarded / Maximum Marks
```

Preserve original attempt history.

Never overwrite Attempt 1 score with a later retry score.

---

# 18. Retry incorrect questions

When `allow_retry = true`, Student can choose:

```text
Retry Incorrect Questions
```

Create a new attempt linked to the previous attempt.

The retry should contain only previously incorrect questions unless Administrator-selected settings specify a full retry.

Track separately:

```text
initial_score
latest_retry_score
mastery_after_correction
```

These may be computed in services/reporting rather than redundantly stored if repository patterns favor derived values.

Respect `max_attempts` when populated.

---

# 19. Automatic scoring

Auto-score only question types with reliable deterministic answer rules.

Examples:

- MCQ: exact selected option ID/value
- True/False: exact boolean/value
- Fill Blank: normalized accepted-answer comparison
- Rearrange Words: normalized canonical sequence
- Sentence Correction: accepted normalized answer set
- Short Answer: accepted-answer list only

Normalization may include:

- trim
- case-folding where appropriate
- collapsing repeated whitespace
- optional punctuation normalization when configured

Do not over-normalize where capitalization/punctuation itself is the learning objective.

Marks awarded must never exceed the question's snapshot marks.

---

# 20. Question Bank + Practice Work navigation

Add a Practice Work section under the existing navigation architecture.

Suggested structure:

```text
Practice Work
├── Overview
├── Question Bank
│   ├── All Questions
│   ├── Generate with AI
│   ├── Add Question
│   ├── Templates
│   └── Generation History
├── Practice Sets
├── Assignments
├── Student Attempts
└── Analytics
```

If current navigation only supports one nesting level, adapt to repository conventions without introducing a broad navigation rewrite.

---

# 21. Administrator UI

Question Bank list filters should include:

```text
Board
Class
Book
Chapter
Skill
Topic
Subtopic
Template
Question Type
Difficulty
Source Type
Active Status
```

Practice Set UI should support:

- create/edit draft
- add from Question Bank
- generate with AI
- reorder questions
- edit question marks
- preview total marks
- publish
- assign to Batch / Students

Published Practice Sets should become structurally protected. Do not casually edit snapshots after students have attempted them.

If changes are required after attempts exist, prefer cloning/versioning or a controlled reopen strategy rather than mutating historical assessment content.

---

# 22. Student UI

Student should see only their own assigned Practice Work.

Suggested states:

```text
New
In Progress
Completed
Needs More Practice
```

Practice card should show:

- title
- topic
- question count
- total marks
- due date if any
- attempt status

Student cannot access raw Question Bank management or generation-history pages.

---

# 23. Parent visibility

Parent may read Practice Work progress for linked children through `student_parent_links`.

Parent view may show:

- assigned practice
- completion status
- initial score
- latest/retry score
- improvement

Do not expose hidden correct-answer data for not-yet-completed assignments merely because the Parent can view assignment progress.

Full Parent dashboard redesign is not required if outside this module's current UI scope.

---

# 24. RLS/security

Enable RLS on every new public table.

Administrator:

- manage templates
- manage Question Bank
- generate/review questions
- manage Practice Sets
- assign Practice Work
- review attempts

Student:

- read own assignments/sets/questions needed for an active attempt
- create/update own attempt data through controlled RPC/service pathways
- never read raw hidden answers before allowed reveal state
- never mutate Question Bank/templates

Parent:

- read linked-child Practice progress only
- no mutation

Institute and branch scope must follow existing repository patterns.

Do not rely on browser filtering for authorization.

Do not expose answer keys through a broad SELECT policy that makes them retrievable before submission. If necessary, use controlled RPCs/views or separate answer storage/access patterns.

This answer-key security requirement is critical.

---

# 25. Atomic database operations

Use transactional RPCs where multi-table consistency matters, especially for:

- approving generated questions
- publishing a Practice Set
- assigning a set to a Batch
- starting an attempt
- submitting/scoring an attempt
- creating retry attempts

Prefer `SECURITY INVOKER` where feasible.

Revoke function execution from `PUBLIC` and `anon`, grant explicitly to `authenticated` where appropriate, and perform authorization inside functions/services consistent with Module 06 conventions.

---

# 26. OpenAI service architecture

Create a server-only service such as:

```text
features/practice-work/services/ai-question-service.ts
```

Responsibilities:

- build generation request from structured form values + selected template + optional special instructions
- call OpenAI Responses API
- request structured JSON output
- validate output
- normalize questions
- return typed preview data
- capture safe generation metadata/errors

Do not call OpenAI from Client Components.

Use retry/backoff only for appropriate transient errors; do not blindly retry malformed-content failures without limits.

Map API errors to Administrator-friendly messages without exposing secrets or raw sensitive headers.

---

# 27. Suggested feature folder

Follow repository conventions, approximately:

```text
features/practice-work/
├── actions/
├── components/
├── schemas/
├── services/
├── types/
└── utils/
```

Likely files:

```text
types/practice-work.ts
schemas/question-schema.ts
schemas/ai-generation-schema.ts
schemas/practice-set-schema.ts
schemas/assignment-schema.ts
schemas/attempt-schema.ts
services/question-bank-service.ts
services/question-template-service.ts
services/ai-question-service.ts
services/practice-set-service.ts
services/practice-assignment-service.ts
services/practice-attempt-service.ts
actions/question-bank-actions.ts
actions/practice-set-actions.ts
actions/practice-attempt-actions.ts
```

Use actual project naming conventions discovered during inspection.

---

# 28. Routes

Suggested protected Administrator routes:

```text
app/(protected)/practice-work/page.tsx
app/(protected)/practice-work/question-bank/page.tsx
app/(protected)/practice-work/question-bank/generate/page.tsx
app/(protected)/practice-work/templates/page.tsx
app/(protected)/practice-work/generations/page.tsx
app/(protected)/practice-work/sets/page.tsx
app/(protected)/practice-work/sets/[id]/page.tsx
app/(protected)/practice-work/assignments/page.tsx
app/(protected)/practice-work/attempts/page.tsx
```

Student routes should follow existing Student portal conventions.

Do not invent a second authentication shell.

---

# 29. Validation requirements

Use Zod for all Server Action/API inputs.

Validate at minimum:

- optional Board/Class UUIDs
- optional book/chapter trimmed lengths
- skill/topic/subtopic lengths
- template ownership
- supported question type
- supported difficulty
- question count bounds
- special-instruction max length
- valid marks (`> 0`, reasonable precision/range)
- Practice Set dates
- `max_attempts >= 1` when provided
- no zero-question publish
- total marks > 0
- assignment target validity

Do not trust `institute_id`, Student IDs, Batch IDs, or ownership identifiers directly from client input without server-side scope verification.

---

# 30. AI output schema

Use structured output shaped approximately as:

```ts
{
  questions: [
    {
      questionType: string,
      questionText: string,
      options: string[] | null,
      acceptedAnswers: string[] | null,
      correctAnswer: string | boolean | string[],
      explanation: string,
      difficulty: "beginner" | "intermediate" | "advanced",
      suggestedMarks: number,
      tags: string[]
    }
  ]
}
```

Adapt exact shape by question type.

Do not accept arbitrary free-form AI responses into the database.

---

# 31. Question source/context display

Question Bank should visibly show provenance such as:

```text
Source: AI / Manual
Board: CBSE
Class: 7
Book: optional
Chapter: optional
Skill: Grammar
Topic: Tenses
```

Do not claim "textbook grounded" unless actual source content exists in a future source-grounding feature.

Use wording such as:

```text
AI-generated using book/chapter reference
```

when only names were supplied.

---

# 32. Analytics foundation

Module 07 should provide enough data for later analytics, including:

- assignments count
- completion rate
- first-attempt percentage
- retry percentage
- improvement
- topic/subtopic performance
- question difficulty performance
- per-question correctness frequency

A full analytics dashboard can remain lightweight if necessary, but schema must preserve these facts.

Do not overwrite historical attempts.

---

# 33. Testing

Use the repository's established SQL verification + application verification approach.

Add transactional SQL tests for:

- tenant isolation
- RLS
- template ownership
- Question Bank CRUD authorization
- optional Board/Class/Book/Chapter values
- AI-generation metadata persistence
- approval workflow
- question snapshot immutability
- marks modes
- total marks calculation
- Batch assignment recipient resolution
- duplicate assignment prevention
- Student attempt ownership
- answer-key isolation before submission
- deterministic scoring
- submitted-answer reveal behavior
- retry-only-incorrect behavior
- max-attempt enforcement
- Parent linked-child read isolation
- Learning Planner `schedule_event_id` linkage

Application verification:

```text
npm.cmd run lint
npx.cmd next typegen
npx.cmd tsc --noEmit
npm.cmd run build
git diff --check
```

Also audit every rendered `.map(` for stable unique React keys.

---

# 34. OpenAI integration verification

If `OPENAI_API_KEY` is available in the local/test environment, perform a safe small generation test (for example 2–3 questions) and confirm:

- server-only call succeeds
- structured output validates
- generated content reaches review state only
- no questions auto-save as approved
- API key is not exposed in client bundles/logs

If no key is configured, do not fabricate a passing integration test. Report that live AI generation could not be executed and verify all non-network logic with mocks/fixtures only if the project already has a suitable testing pattern.

Do not add a test framework solely for this feature unless required by repository conventions.

---

# 35. Explicitly out of scope

Do not implement in Module 07 unless already required by the repository architecture:

```text
Internet scraping of CBSE/ICSE textbooks
Automatic retrieval of copyrighted textbook chapters
PDF textbook ingestion / OCR
Vector embeddings / semantic RAG
Subjective essay grading by AI
Negative marking
Examination marks/report cards
WhatsApp delivery
SMS delivery
Full AI learning recommendations
```

Textbook-source upload/RAG can be a later enhancement.

---

# 36. Definition of Done

Module 07 is complete only when:

- Question Templates work
- Question Bank works
- AI generation form works
- optional Board/Class/Book/Chapter work
- Special Instructions for AI work
- generated questions require review/approval
- manual question creation works
- duplicate warning works
- Practice Sets work
- question snapshots work
- marks-per-question modes work
- total marks calculate correctly
- Batch/Student assignment works
- Learning Planner linkage works optionally
- Student attempts work
- deterministic scoring works
- answers/explanations reveal only at correct time
- retry incorrect questions works
- original attempt remains preserved
- Student/Parent RLS is verified
- hidden answers are protected
- lint/typecheck/build/diff checks pass
- no Attendance regression
- no Learning Planner regression

---

# 37. Implementation order

Use this sequence:

```text
01 Repository inspection
02 Database schema + rollback
03 RLS + answer-key security design
04 SQL verification foundation
05 Shared types
06 Zod schemas
07 Question Templates service/UI
08 Question Bank service/UI
09 OpenAI server integration
10 AI generation/review workflow
11 Practice Sets + snapshots
12 Marks modes and total calculations
13 Assignment workflow
14 Student attempt/scoring workflow
15 Answer reveal/self-correction
16 Retry incorrect questions
17 Parent read model
18 Learning Planner integration
19 Analytics foundation
20 Navigation/routes
21 Full application + SQL verification
22 Final implementation report
```

---

# Required Codex final report

When finished, report:

1. Repository findings
2. Files created
3. Files modified
4. Migration filename
5. Rollback filename
6. Tables created
7. RLS/security design
8. How hidden answers are protected
9. Question templates implemented
10. Question Bank behavior
11. AI integration details
12. OpenAI model/config approach
13. Optional Board/Class/Book/Chapter behavior
14. Special Instructions behavior
15. AI review/approval flow
16. Duplicate-detection behavior
17. Practice Set snapshot behavior
18. Marks modes and total-marks behavior
19. Assignment behavior
20. Learning Planner integration
21. Student attempt/scoring behavior
22. Self-correction behavior
23. Retry behavior
24. Parent visibility
25. Tests and exact verification results
26. Live OpenAI test result, or explicit reason it could not be run
27. Attendance compatibility
28. Learning Planner compatibility
29. Deferred scope
30. `git status`

Do not commit or push.

import assert from "node:assert/strict";
import test from "node:test";

import JSZip from "jszip";
import { PDFDocument, StandardFonts } from "pdf-lib";

import { extractQuestions } from "./document-extraction-service";
import { validateQuestionImportFile } from "./question-import-file";

async function createPdf() {
  const document = await PDFDocument.create();
  const page = document.addPage();
  const font = await document.embedFont(StandardFonts.Helvetica);
  page.drawText("1. What is a noun? (2 marks)\n2. Correct this sentence. [3 marks]", { x: 40, y: 750, size: 12, font, lineHeight: 20 });
  return document.save();
}

async function createDocx() {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", "<?xml version=\"1.0\"?><Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"><Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/><Default Extension=\"xml\" ContentType=\"application/xml\"/><Override PartName=\"/word/document.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml\"/></Types>");
  zip.folder("_rels")?.file(".rels", "<?xml version=\"1.0\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"word/document.xml\"/></Relationships>");
  zip.folder("word")?.file("document.xml", "<?xml version=\"1.0\"?><w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:body><w:p><w:r><w:t>1. Define a verb. (2 marks)</w:t></w:r></w:p><w:p><w:r><w:t>2. Write one sentence. [3 marks]</w:t></w:r></w:p></w:body></w:document>");
  return new Uint8Array(await zip.generateAsync({ type: "uint8array" }));
}

async function expectCode(action: () => Promise<unknown>, code: string) {
  await assert.rejects(action, (error: unknown) => error instanceof Error && error.message === code);
}

function blobPart(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer;
}

test("native PDF extraction returns review drafts", async () => {
  const bytes = await createPdf();
  const validated = await validateQuestionImportFile(new File([blobPart(bytes)], "questions.pdf", { type: "application/pdf" }));
  const drafts = await extractQuestions(validated.bytes, validated.mimeType, "questions.pdf");
  assert.equal(drafts.length, 2);
  assert.deepEqual(drafts.map(question => question.suggestedMarks), [2, 3]);
  assert.ok(drafts.every(question => question.correctAnswer === "REVIEW REQUIRED"));
});

test("DOCX extraction returns review drafts", async () => {
  const bytes = await createDocx();
  const validated = await validateQuestionImportFile(new File([blobPart(bytes)], "questions.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }));
  const drafts = await extractQuestions(validated.bytes, validated.mimeType, "questions.docx");
  assert.equal(drafts.length, 2);
  assert.deepEqual(drafts.map(question => question.suggestedMarks), [2, 3]);
});

test("malformed, unsupported, oversized, and mismatched files are rejected", async () => {
  await expectCode(() => validateQuestionImportFile(new File(["bad"], "bad.pdf", { type: "application/pdf" })), "MALFORMED_OR_UNSUPPORTED_FILE");
  await expectCode(() => validateQuestionImportFile(new File(["bad"], "bad.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })), "MALFORMED_OR_UNSUPPORTED_FILE");
  await expectCode(() => validateQuestionImportFile(new File(["legacy"], "legacy.doc", { type: "application/msword" })), "LEGACY_DOC_UNSUPPORTED");
  await expectCode(() => validateQuestionImportFile(new File([blobPart(new Uint8Array(15 * 1024 * 1024 + 1))], "large.pdf", { type: "application/pdf" })), "FILE_TOO_LARGE");
  const pdf = await createPdf();
  await expectCode(() => validateQuestionImportFile(new File([blobPart(pdf)], "wrong.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })), "FILE_TYPE_MISMATCH");
});

test("SHA-256 fingerprint is stable for duplicate uploads", async () => {
  const bytes = await createPdf();
  const first = await validateQuestionImportFile(new File([blobPart(bytes)], "first.pdf", { type: "application/pdf" }));
  const second = await validateQuestionImportFile(new File([blobPart(bytes)], "renamed.pdf", { type: "application/pdf" }));
  assert.equal(first.sha256, second.sha256);
  assert.match(first.sha256, /^[0-9a-f]{64}$/);
});

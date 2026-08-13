import "server-only";

import { createHash } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";

const MAX_BYTES = 15 * 1024 * 1024;
const allowed = new Set(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/png"]);
const extensions = new Set(["pdf", "docx", "jpg", "jpeg", "png"]);

export async function validateQuestionImportFile(file: File) {
  if (!file.size || file.size > MAX_BYTES) throw new Error("FILE_TOO_LARGE");
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (extension === "doc") throw new Error("LEGACY_DOC_UNSUPPORTED");
  if (!extensions.has(extension)) throw new Error("UNSUPPORTED_FILE_TYPE");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = await fileTypeFromBuffer(bytes);
  if (!detected || !allowed.has(detected.mime)) throw new Error("MALFORMED_OR_UNSUPPORTED_FILE");
  if (!allowed.has(file.type || detected.mime) || (file.type !== "" && file.type !== detected.mime)) throw new Error("FILE_TYPE_MISMATCH");
  return { bytes, mimeType: detected.mime, sha256: createHash("sha256").update(bytes).digest("hex") };
}

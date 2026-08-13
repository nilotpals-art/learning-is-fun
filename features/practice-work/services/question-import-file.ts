import "server-only";

import { createHash } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";

export const QUESTION_IMPORT_MAX_BYTES = 15 * 1024 * 1024;
const allowed = new Set(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/png"]);
const extensions = new Set(["pdf", "docx", "jpg", "jpeg", "png"]);

export function validateQuestionImportMetadata(filename:string,mimeType:string,byteSize:number){if(!byteSize||byteSize>QUESTION_IMPORT_MAX_BYTES)throw new Error("FILE_TOO_LARGE");const extension=filename.split(".").pop()?.toLowerCase()??"";if(extension==="doc")throw new Error("LEGACY_DOC_UNSUPPORTED");if(!extensions.has(extension)||!allowed.has(mimeType))throw new Error("UNSUPPORTED_FILE_TYPE");return{extension}}
export async function validateQuestionImportBytes(bytes:Uint8Array,filename:string,declaredMimeType:string){validateQuestionImportMetadata(filename,declaredMimeType,bytes.byteLength);const detected=await fileTypeFromBuffer(bytes);if(!detected||!allowed.has(detected.mime))throw new Error("MALFORMED_OR_UNSUPPORTED_FILE");if(declaredMimeType!==detected.mime)throw new Error("FILE_TYPE_MISMATCH");return{bytes,mimeType:detected.mime,sha256:createHash("sha256").update(bytes).digest("hex")}}
export async function validateQuestionImportFile(file: File) {
  validateQuestionImportMetadata(file.name,file.type,file.size);
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (extension === "doc") throw new Error("LEGACY_DOC_UNSUPPORTED");
  if (!extensions.has(extension)) throw new Error("UNSUPPORTED_FILE_TYPE");
  const bytes = new Uint8Array(await file.arrayBuffer());
  return validateQuestionImportBytes(bytes,file.name,file.type);
}

import "server-only";

import { randomUUID } from "node:crypto";
import type { AuthProfile } from "@/features/auth/types/auth";
import { validateQuestionImportBytes, validateQuestionImportMetadata } from "@/features/practice-work/services/question-import-file";
import { createClient } from "@/lib/supabase/server";

export class QuestionImportError extends Error { constructor(message:string,readonly generationId:string){super(message)} }

export async function authorizeQuestionImportUpload(profile:AuthProfile,input:{filename:string;mimeType:string;byteSize:number}){
  if(!profile.instituteId)throw new Error("PRACTICE_UNAUTHORIZED");
  validateQuestionImportMetadata(input.filename,input.mimeType,input.byteSize);
  const s=await createClient(),sourceId=randomUUID(),safeName=input.filename.replace(/[^A-Za-z0-9._-]/g,"_").slice(-180),path=`question-imports/${profile.instituteId}/${sourceId}/${safeName}`;
  const{data,error}=await s.storage.from("practice-work-private").createSignedUploadUrl(path);
  if(error)throw new Error(`STORAGE_UPLOAD_AUTH:${error.message}`);
  return{sourceId,storagePath:path,uploadToken:data.token};
}

export async function processUploadedQuestions(profile:AuthProfile,input:{sourceId:string;storagePath:string;originalFilename:string;declaredMimeType:string;declaredByteSize:number;clientSha256?:string;boardId:string;classId:string;subjectId:string;bookName?:string;chapter?:string;questionExamDate?:string;sourceFullMarks:number}){
  if(!profile.instituteId)throw new Error("PRACTICE_UNAUTHORIZED");
  const s=await createClient(),instituteId=profile.instituteId,expectedPrefix=`question-imports/${instituteId}/${input.sourceId}/`;
  if(!input.storagePath.startsWith(expectedPrefix)||input.storagePath.slice(expectedPrefix.length).includes("/"))throw new Error("IMPORT_PATH_INVALID");
  validateQuestionImportMetadata(input.originalFilename,input.declaredMimeType,input.declaredByteSize);
  if(!["application/pdf","image/jpeg","image/png"].includes(input.declaredMimeType))throw new Error("UNSUPPORTED_FILE");
  await validateOwnership(s,instituteId,input);
  const download=await s.storage.from("practice-work-private").download(input.storagePath);
  if(download.error)throw new Error(`STORAGE_DOWNLOAD:${download.error.message}`);
  const bytes=new Uint8Array(await download.data.arrayBuffer());
  let validated;
  try{
    validated=await validateQuestionImportBytes(bytes,input.originalFilename,input.declaredMimeType);
    if(bytes.byteLength!==input.declaredByteSize)throw new Error("FILE_SIZE_MISMATCH");
    if(input.clientSha256&&validated.sha256!==input.clientSha256)throw new Error("FILE_HASH_MISMATCH");
  }catch(error){
    await s.storage.from("practice-work-private").remove([input.storagePath]);
    throw error;
  }
  const{mimeType,sha256}=validated;
  const{data:duplicate}=await s.from("practice_question_source_files").select("id").eq("institute_id",instituteId).eq("sha256",sha256).maybeSingle();
  if(duplicate){await s.storage.from("practice-work-private").remove([input.storagePath]);throw new Error("DUPLICATE_IMPORT")}
  const displayTitle=[input.bookName,input.chapter].filter(Boolean).join(" · ")||input.originalFilename;
  const{error}=await s.from("practice_question_source_files").insert({
    id:input.sourceId,institute_id:instituteId,storage_path:input.storagePath,original_filename:input.originalFilename,mime_type:mimeType,byte_size:bytes.byteLength,sha256,status:"ready",created_by:profile.id,
    board_id:input.boardId,class_id:input.classId,subject_id:input.subjectId,book_name:input.bookName??null,chapter:input.chapter??null,question_exam_date:input.questionExamDate??null,source_full_marks:input.sourceFullMarks,display_title:displayTitle
  });
  if(error){await s.storage.from("practice-work-private").remove([input.storagePath]);throw error}
  return input.sourceId;
}

export async function retryQuestionExtraction(_profile?:AuthProfile,_generationId?:string):Promise<never>{throw new Error("IMPORT_RETRY_NOT_SUPPORTED")}

async function validateOwnership(s:Awaited<ReturnType<typeof createClient>>,instituteId:string,m:{boardId:string;classId:string;subjectId:string}){
  const results=await Promise.all([
    s.from("boards").select("id").eq("id",m.boardId).eq("institute_id",instituteId).maybeSingle(),
    s.from("academic_classes").select("id").eq("id",m.classId).eq("institute_id",instituteId).maybeSingle(),
    s.from("subjects").select("id").eq("id",m.subjectId).eq("institute_id",instituteId).maybeSingle()
  ]);
  if(results.some(r=>r.error||!r.data))throw new Error("PRACTICE_REFERENCE_INVALID");
}

import "server-only";

import type { AuthProfile } from "@/features/auth/types/auth";
import { createClient } from "@/lib/supabase/server";

const one=<T>(value:T|T[]|null):T|null=>!value?null:Array.isArray(value)?value[0]??null:value;
function institute(profile:AuthProfile){if(!profile.instituteId)throw new Error("PRACTICE_UNAUTHORIZED");return profile.instituteId}

export interface UploadedQuestionFile {
  id:string; title:string; originalFilename:string; mimeType:string; boardName:string|null; className:string|null; subjectName:string|null;
  bookName:string|null; chapter:string|null; questionExamDate:string|null; sourceFullMarks:number|null; createdAt:string;
}
export interface UploadedQuestionFileAssignment {
  id:string; sourceFileId:string; title:string; originalFilename:string; mimeType:string; studentId:string; studentName:string; dueAt:string|null; availableFrom:string|null; status:"assigned"|"closed"; createdAt:string;
}

export async function listUploadedQuestionFiles(profile:AuthProfile):Promise<UploadedQuestionFile[]>{
  const s=await createClient();
  const{data,error}=await s.from("practice_question_source_files")
    .select("id,display_title,original_filename,mime_type,book_name,chapter,question_exam_date,source_full_marks,created_at,board:boards(name),academic_class:academic_classes(class_name),subject:subjects(subject_name)")
    .eq("institute_id",institute(profile)).eq("status","ready").order("created_at",{ascending:false});
  if(error)throw error;
  return(data??[]).map(row=>({id:row.id,title:row.display_title??row.original_filename,originalFilename:row.original_filename,mimeType:row.mime_type,boardName:one(row.board)?.name??null,className:one(row.academic_class)?.class_name??null,subjectName:one(row.subject)?.subject_name??null,bookName:row.book_name,chapter:row.chapter,questionExamDate:row.question_exam_date,sourceFullMarks:row.source_full_marks===null?null:Number(row.source_full_marks),createdAt:row.created_at}));
}

export async function assignUploadedQuestionFile(profile:AuthProfile,input:{sourceFileId:string;batchId?:string;studentIds?:string[];availableFrom?:string;dueAt?:string}){
  const instituteId=institute(profile),s=await createClient();
  const{data:file,error:fileError}=await s.from("practice_question_source_files").select("id").eq("id",input.sourceFileId).eq("institute_id",instituteId).eq("status","ready").maybeSingle();
  if(fileError||!file)throw new Error("PRACTICE_FILE_NOT_FOUND");
  const ids=new Set(input.studentIds??[]);
  if(input.batchId){
    const{data:batch,error:batchError}=await s.from("batches").select("id").eq("id",input.batchId).eq("institute_id",instituteId).eq("is_active",true).maybeSingle();
    if(batchError||!batch)throw new Error("PRACTICE_BATCH_INVALID");
    const{data:members,error:memberError}=await s.from("student_assignments").select("student_id").eq("institute_id",instituteId).eq("batch_id",input.batchId).eq("status","Active");
    if(memberError)throw memberError;
    for(const member of members??[])ids.add(member.student_id);
  }
  if(!ids.size)throw new Error("PRACTICE_STUDENTS_REQUIRED");
  const studentIds=[...ids];
  const{data:students,error:studentError}=await s.from("students").select("id").eq("institute_id",instituteId).eq("status","Active").in("id",studentIds);
  if(studentError||!students||students.length!==studentIds.length)throw new Error("PRACTICE_STUDENT_INVALID");
  const rows=studentIds.map(studentId=>({institute_id:instituteId,source_file_id:input.sourceFileId,batch_id:input.batchId??null,student_id:studentId,available_from:input.availableFrom||null,due_at:input.dueAt||null,created_by:profile.id,status:"assigned"}));
  const{error}=await s.from("practice_file_assignments").upsert(rows,{onConflict:"source_file_id,student_id",ignoreDuplicates:false});
  if(error)throw error;
  return{assignedCount:studentIds.length};
}

export async function listUploadedQuestionFileAssignments(profile:AuthProfile):Promise<UploadedQuestionFileAssignment[]>{
  const s=await createClient();
  const{data,error}=await s.from("practice_file_assignments").select("id,source_file_id,student_id,available_from,due_at,status,created_at,file:practice_question_source_files(display_title,original_filename,mime_type),student:students(name)").eq("institute_id",institute(profile)).order("created_at",{ascending:false});
  if(error)throw error;
  return(data??[]).map(row=>{const file=one(row.file);return{id:row.id,sourceFileId:row.source_file_id,title:file?.display_title??file?.original_filename??"Uploaded Question File",originalFilename:file?.original_filename??"",mimeType:file?.mime_type??"application/octet-stream",studentId:row.student_id,studentName:one(row.student)?.name??"",dueAt:row.due_at,availableFrom:row.available_from,status:row.status as "assigned"|"closed",createdAt:row.created_at}});
}

export async function getAssignedQuestionFileUrl(profile:AuthProfile,assignmentId:string){
  const s=await createClient(),instituteId=institute(profile);
  const{data,error}=await s.from("practice_file_assignments").select("id,available_from,status,file:practice_question_source_files(storage_path)").eq("id",assignmentId).eq("institute_id",instituteId).maybeSingle();
  if(error||!data)throw new Error("PRACTICE_FILE_ASSIGNMENT_NOT_FOUND");
  if(data.status==="closed")throw new Error("PRACTICE_FILE_ASSIGNMENT_CLOSED");
  if(data.available_from&&new Date(data.available_from)>new Date())throw new Error("PRACTICE_FILE_NOT_AVAILABLE");
  const file=one(data.file);if(!file)throw new Error("PRACTICE_FILE_NOT_FOUND");
  const signed=await s.storage.from("practice-work-private").createSignedUrl(file.storage_path,300);
  if(signed.error)throw signed.error;
  return signed.data.signedUrl;
}

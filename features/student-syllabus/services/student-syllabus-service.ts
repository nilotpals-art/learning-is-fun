import "server-only";

import type { AuthProfile } from "@/features/auth/types/auth";
import { createClient } from "@/lib/supabase/server";

const MAX_FILES=8;
const MAX_FILE_BYTES=2*1024*1024;
const MAX_TOTAL_BYTES=4*1024*1024;
const ALLOWED=new Set(["application/pdf","image/jpeg","image/png"]);
const one=<T>(value:T|T[]|null):T|null=>!value?null:Array.isArray(value)?value[0]??null:value;

export interface SyllabusSubjectOption { id:string; label:string }
export interface SyllabusSubmissionAudit { id:string; subjectName:string; bookName:string|null; chapter:string|null; examName:string|null; fileCount:number; fileNames:string[]; totalBytes:number; deliveryStatus:"pending"|"sent"|"failed"; submittedAt:string }

function scope(profile:AuthProfile){if(!profile.instituteId)throw new Error("SYLLABUS_UNAUTHORIZED");return profile.instituteId}

export async function getStudentSyllabusContext(profile:AuthProfile){
  const s=await createClient(),instituteId=scope(profile);
  const{data:student,error:studentError}=await s.from("students").select("id,name,admission_no").eq("institute_id",instituteId).eq("profile_id",profile.id).maybeSingle();
  if(studentError||!student)throw new Error("SYLLABUS_STUDENT_NOT_FOUND");
  const{data:links,error:linkError}=await s.from("student_assignments").select("batch_id").eq("institute_id",instituteId).eq("student_id",student.id).eq("status","Active");
  if(linkError)throw linkError;
  const batchIds=[...new Set((links??[]).map(v=>v.batch_id).filter(Boolean))] as string[];
  let subjects:SyllabusSubjectOption[]=[];
  if(batchIds.length){
    const{data:batches,error:batchError}=await s.from("batches").select("subject_id,subject:subjects(id,subject_name)").eq("institute_id",instituteId).in("id",batchIds).eq("is_active",true);
    if(batchError)throw batchError;
    const map=new Map<string,string>();
    for(const row of batches??[]){const subject=one(row.subject);if(subject?.id)map.set(subject.id,subject.subject_name)}
    subjects=[...map.entries()].map(([id,label])=>({id,label})).sort((a,b)=>a.label.localeCompare(b.label));
  }
  if(!subjects.length){
    const{data:all,error}=await s.from("subjects").select("id,subject_name").eq("institute_id",instituteId).order("subject_name");
    if(error)throw error;subjects=(all??[]).map(v=>({id:v.id,label:v.subject_name}));
  }
  return{studentId:student.id,studentName:student.name,admissionNo:student.admission_no,subjects};
}

export async function listStudentSyllabusSubmissions(profile:AuthProfile):Promise<SyllabusSubmissionAudit[]>{
  const s=await createClient(),instituteId=scope(profile);
  const{data:student,error:studentError}=await s.from("students").select("id").eq("institute_id",instituteId).eq("profile_id",profile.id).maybeSingle();
  if(studentError||!student)return[];
  const{data,error}=await s.from("student_syllabus_submissions").select("id,book_name,chapter,exam_name,file_count,file_names,total_bytes,delivery_status,submitted_at,subject:subjects(subject_name)").eq("institute_id",instituteId).eq("student_id",student.id).order("submitted_at",{ascending:false}).limit(20);
  if(error)throw error;
  return(data??[]).map(row=>({id:row.id,subjectName:one(row.subject)?.subject_name??"Subject",bookName:row.book_name,chapter:row.chapter,examName:row.exam_name,fileCount:row.file_count,fileNames:Array.isArray(row.file_names)?row.file_names.map(String):[],totalBytes:Number(row.total_bytes),deliveryStatus:row.delivery_status as SyllabusSubmissionAudit["deliveryStatus"],submittedAt:row.submitted_at}));
}

export async function sendSyllabusPages(profile:AuthProfile,input:{subjectId:string;bookName?:string;chapter?:string;examName?:string;note?:string;files:File[]}){
  const s=await createClient(),instituteId=scope(profile);
  const recipient=(process.env.SYLLABUS_SUBMISSION_EMAIL??"").trim();
  const apiKey=(process.env.BREVO_API_KEY??"").trim();
  const senderEmail=(process.env.BREVO_SENDER_EMAIL??recipient).trim();
  if(!recipient||!apiKey||!senderEmail)throw new Error("SYLLABUS_EMAIL_NOT_CONFIGURED");
  const context=await getStudentSyllabusContext(profile);
  if(!context.subjects.some(v=>v.id===input.subjectId))throw new Error("SYLLABUS_SUBJECT_INVALID");
  if(!input.files.length||input.files.length>MAX_FILES)throw new Error("SYLLABUS_FILE_COUNT");
  let totalBytes=0;
  for(const file of input.files){if(!ALLOWED.has(file.type))throw new Error("SYLLABUS_FILE_TYPE");if(!file.size||file.size>MAX_FILE_BYTES)throw new Error("SYLLABUS_FILE_TOO_LARGE");totalBytes+=file.size}
  if(totalBytes>MAX_TOTAL_BYTES)throw new Error("SYLLABUS_TOTAL_TOO_LARGE");
  const subject=context.subjects.find(v=>v.id===input.subjectId)!;
  const fileNames=input.files.map(v=>v.name);
  const{data:audit,error:auditError}=await s.from("student_syllabus_submissions").insert({institute_id:instituteId,student_id:context.studentId,subject_id:input.subjectId,book_name:input.bookName?.trim().toUpperCase()||null,chapter:input.chapter?.trim().toUpperCase()||null,exam_name:input.examName?.trim().toUpperCase()||null,student_note:input.note?.trim()||null,recipient_email:recipient,file_names:fileNames,file_count:input.files.length,total_bytes:totalBytes,delivery_status:"pending"}).select("id").single();
  if(auditError)throw auditError;
  try{
    const attachments=await Promise.all(input.files.map(async file=>({name:file.name,content:Buffer.from(await file.arrayBuffer()).toString("base64")})));
    const title=`Syllabus Pages | ${subject.label} | ${context.studentName}`;
    const html=[
      `<h2>Syllabus Pages from Student</h2>`,
      `<p><strong>Student:</strong> ${escapeHtml(context.studentName)}</p>`,
      `<p><strong>Admission No:</strong> ${escapeHtml(context.admissionNo??"-")}</p>`,
      `<p><strong>Subject:</strong> ${escapeHtml(subject.label)}</p>`,
      input.bookName?`<p><strong>Book:</strong> ${escapeHtml(input.bookName)}</p>`:"",
      input.chapter?`<p><strong>Chapter / Topic:</strong> ${escapeHtml(input.chapter)}</p>`:"",
      input.examName?`<p><strong>Exam / Test:</strong> ${escapeHtml(input.examName)}</p>`:"",
      input.note?`<p><strong>Student Note:</strong> ${escapeHtml(input.note)}</p>`:"",
      `<p><strong>Files:</strong> ${fileNames.map(escapeHtml).join(", ")}</p>`,
      `<p><strong>Sent from:</strong> ${escapeHtml(profile.instituteName??"Student Portal")}</p>`
    ].join("");
    const response=await fetch("https://api.brevo.com/v3/smtp/email",{method:"POST",headers:{"api-key":apiKey,"content-type":"application/json","accept":"application/json"},body:JSON.stringify({sender:{email:senderEmail,name:profile.instituteName??"Learning Is Fun"},to:[{email:recipient}],replyTo:profile.email?{email:profile.email,name:context.studentName}:undefined,subject:title,htmlContent:html,attachment:attachments}),cache:"no-store"});
    const body=await response.json().catch(()=>({})) as {messageId?:string;code?:string};
    if(!response.ok)throw new Error(`BREVO_${response.status}_${body.code??"ERROR"}`);
    await s.from("student_syllabus_submissions").update({delivery_status:"sent",provider_message_id:body.messageId??null,safe_error_code:null}).eq("id",audit.id).eq("student_id",context.studentId);
    return{auditId:audit.id,messageId:body.messageId??null};
  }catch(error){
    const code=(error instanceof Error?error.message:"SYLLABUS_EMAIL_FAILED").slice(0,120);
    await s.from("student_syllabus_submissions").update({delivery_status:"failed",safe_error_code:code}).eq("id",audit.id).eq("student_id",context.studentId);
    throw error;
  }
}

function escapeHtml(value:string){return value.replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[char]??char))}

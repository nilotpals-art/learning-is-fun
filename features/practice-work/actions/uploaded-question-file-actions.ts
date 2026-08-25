"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { processQuestionImportSchema } from "@/features/practice-work/schemas/question-import-schema";
import { processUploadedQuestions } from "@/features/practice-work/services/question-import-service";
import { assignUploadedQuestionFile } from "@/features/practice-work/services/uploaded-question-file-service";
import type { PracticeActionResult } from "@/features/practice-work/types/practice-work";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

const assignSchema=z.object({sourceFileId:z.string().uuid(),batchId:z.union([z.string().uuid(),z.literal("")]).optional().transform(v=>v||undefined),studentIds:z.array(z.string().uuid()).default([]),availableFrom:z.string().optional(),dueAt:z.string().optional()}).superRefine((v,c)=>{if(!v.batchId&&!v.studentIds.length)c.addIssue({code:"custom",path:["studentIds"],message:"Select a batch or at least one student."})});
const refresh=()=>["/practice-work","/practice-work/assignments","/practice-work/my-work"].forEach(path=>revalidatePath(path));

export async function saveUploadedQuestionFileAction(input:unknown):Promise<PracticeActionResult<{sourceFileId:string}>>{
  const parsed=processQuestionImportSchema.safeParse(input);
  if(!parsed.success)return{status:"error",message:"Complete Board, Class, Subject, Full Marks and select a valid PDF/JPG/PNG file.",fieldErrors:parsed.error.flatten().fieldErrors};
  try{
    const profile=await requireRole(DASHBOARD_ROLES),sourceFileId=await processUploadedQuestions(profile,parsed.data);
    refresh();
    return{status:"success",message:"Question file saved exactly as uploaded. No AI extraction was performed.",data:{sourceFileId}};
  }catch(error){
    const code=error instanceof Error?error.message:"";
    const message=code.includes("DUPLICATE_IMPORT")?"This exact file is already saved.":code.includes("UNSUPPORTED_FILE")?"Only PDF, JPG/JPEG and PNG question files are supported.":code.includes("FILE_TOO_LARGE")?"File is too large. Maximum size is 15 MB.":code.includes("FILE_TYPE_MISMATCH")||code.includes("MALFORMED")?"The uploaded file does not match its declared file type or is damaged.":"The question file could not be saved.";
    return{status:"error",message};
  }
}

export async function assignUploadedQuestionFileAction(input:unknown):Promise<PracticeActionResult>{
  const parsed=assignSchema.safeParse(input);
  if(!parsed.success)return{status:"error",message:"Select an uploaded question file and a batch or students.",fieldErrors:parsed.error.flatten().fieldErrors};
  try{
    const profile=await requireRole(DASHBOARD_ROLES),result=await assignUploadedQuestionFile(profile,parsed.data);
    refresh();
    return{status:"success",message:`Question file assigned to ${result.assignedCount} Student${result.assignedCount===1?"":"s"}.`};
  }catch{return{status:"error",message:"The uploaded question file could not be assigned."}}
}

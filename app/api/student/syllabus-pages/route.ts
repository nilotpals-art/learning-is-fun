import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/services/auth-service";
import { sendSyllabusPages } from "@/features/student-syllabus/services/student-syllabus-service";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const schema=z.object({
  subjectId:z.string().uuid(),
  bookName:z.string().trim().max(150).optional(),
  chapter:z.string().trim().max(150).optional(),
  examName:z.string().trim().max(150).optional(),
  note:z.string().trim().max(1000).optional(),
});

export async function POST(request:Request){
  try{
    const profile=await requireRole(["Student"]);
    const form=await request.formData();
    const parsed=schema.safeParse({subjectId:form.get("subjectId"),bookName:String(form.get("bookName")??"")||undefined,chapter:String(form.get("chapter")??"")||undefined,examName:String(form.get("examName")??"")||undefined,note:String(form.get("note")??"")||undefined});
    if(!parsed.success)return NextResponse.json({status:"error",message:"Select a valid Subject and check the form details."},{status:400});
    const files=form.getAll("files").filter((value):value is File=>value instanceof File&&value.size>0);
    await sendSyllabusPages(profile,{...parsed.data,files});
    return NextResponse.json({status:"success",message:"Syllabus pages emailed successfully. Only the audit record was saved; the files were not stored in Supabase."});
  }catch(error){
    const code=error instanceof Error?error.message:"";
    const message=code.includes("SYLLABUS_EMAIL_NOT_CONFIGURED")?"Syllabus email delivery is not configured yet.":code.includes("SYLLABUS_FILE_COUNT")?"Attach between 1 and 8 files.":code.includes("SYLLABUS_FILE_TYPE")?"Only PDF, JPG/JPEG and PNG files are allowed.":code.includes("SYLLABUS_FILE_TOO_LARGE")?"Each file must be 2 MB or smaller.":code.includes("SYLLABUS_TOTAL_TOO_LARGE")?"The combined files must be 4 MB or smaller. Send larger sets in separate parts.":code.includes("SYLLABUS_SUBJECT_INVALID")?"Select one of your current subjects.":code.startsWith("BREVO_")?"Email delivery failed. Nothing was stored; please try again.":"The syllabus pages could not be sent.";
    return NextResponse.json({status:"error",message},{status:400});
  }
}

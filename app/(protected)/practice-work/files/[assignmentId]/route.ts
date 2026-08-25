import { NextResponse } from "next/server";
import { getAssignedQuestionFileUrl } from "@/features/practice-work/services/uploaded-question-file-service";
import { requireRole } from "@/lib/auth/services/auth-service";

export async function GET(_request:Request,{params}:{params:Promise<{assignmentId:string}>}){
  try{
    const profile=await requireRole(["Student"]),{assignmentId}=await params;
    const url=await getAssignedQuestionFileUrl(profile,assignmentId);
    return NextResponse.redirect(url);
  }catch{
    return NextResponse.json({error:"Question file is not available."},{status:404});
  }
}

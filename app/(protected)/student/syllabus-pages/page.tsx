import { StudentSyllabusManager } from "@/features/student-syllabus/components/student-syllabus-manager";
import { getStudentSyllabusContext, listStudentSyllabusSubmissions } from "@/features/student-syllabus/services/student-syllabus-service";
import { requireRole } from "@/lib/auth/services/auth-service";

export default async function StudentSyllabusPagesPage(){
  const profile=await requireRole(["Student"]);
  const[context,history]=await Promise.all([getStudentSyllabusContext(profile),listStudentSyllabusSubmissions(profile)]);
  return <div className="space-y-6"><header><h1 className="text-2xl font-bold tracking-tight">Send Syllabus Pages</h1><p className="mt-1 text-sm text-muted-foreground">Email book photos, scans or PDFs to your teacher for exam preparation.</p></header><StudentSyllabusManager subjects={context.subjects} history={history}/></div>;
}

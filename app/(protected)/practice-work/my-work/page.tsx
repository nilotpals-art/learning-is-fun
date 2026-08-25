import { PracticeShell } from "@/features/practice-work/components/practice-shell";
import { StudentPracticeManager } from "@/features/practice-work/components/student-practice-manager";
import { listAssignments } from "@/features/practice-work/services/practice-work-service";
import { listUploadedQuestionFileAssignments } from "@/features/practice-work/services/uploaded-question-file-service";
import { requireRole } from "@/lib/auth/services/auth-service";

export default async function MyPracticePage(){
  const profile=await requireRole(["Student"]);
  const[assignments,fileAssignments]=await Promise.all([listAssignments(profile),listUploadedQuestionFileAssignments(profile)]);
  return <PracticeShell title="My Practice Work" description="Open assigned question files or complete interactive Practice and learn from answer explanations."><StudentPracticeManager assignments={assignments} fileAssignments={fileAssignments}/></PracticeShell>
}

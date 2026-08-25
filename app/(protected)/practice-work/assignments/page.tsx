import { AssignmentsManager } from "@/features/practice-work/components/assignments-manager";
import { PracticeShell } from "@/features/practice-work/components/practice-shell";
import { listAssignments, listPracticeOptions, listPracticeSets } from "@/features/practice-work/services/practice-work-service";
import { listUploadedQuestionFileAssignments, listUploadedQuestionFiles } from "@/features/practice-work/services/uploaded-question-file-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function AssignmentsPage(){
  const profile=await requireRole(DASHBOARD_ROLES);
  const[sets,assignments,options,uploadedFiles,fileAssignments]=await Promise.all([
    listPracticeSets(profile),listAssignments(profile),listPracticeOptions(profile),listUploadedQuestionFiles(profile),listUploadedQuestionFileAssignments(profile)
  ]);
  return <PracticeShell title="Practice Assignments" description="Assign generated Question Papers or original uploaded PDF/JPG question files to a Batch or selected Students."><AssignmentsManager sets={sets} assignments={assignments} options={options} uploadedFiles={uploadedFiles} fileAssignments={fileAssignments}/></PracticeShell>
}

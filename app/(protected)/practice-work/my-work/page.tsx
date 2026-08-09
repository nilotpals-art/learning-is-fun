import { PracticeShell } from "@/features/practice-work/components/practice-shell";
import { StudentPracticeManager } from "@/features/practice-work/components/student-practice-manager";
import { listAssignments } from "@/features/practice-work/services/practice-work-service";
import { requireRole } from "@/lib/auth/services/auth-service";
export default async function MyPracticePage(){const profile=await requireRole(["Student"]);return <PracticeShell title="My Practice Work" description="Complete assigned Practice and learn from answer explanations."><StudentPracticeManager assignments={await listAssignments(profile)}/></PracticeShell>}

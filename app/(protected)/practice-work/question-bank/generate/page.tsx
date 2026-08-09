import { AiGenerationManager } from "@/features/practice-work/components/ai-generation-manager";
import { PracticeShell } from "@/features/practice-work/components/practice-shell";
import { listGeneratedQuestions } from "@/features/practice-work/services/ai-question-service";
import { listPracticeOptions, listTemplates } from "@/features/practice-work/services/practice-work-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";
export default async function GeneratePage({searchParams}:{searchParams:Promise<{generation?:string}>}){const profile=await requireRole(DASHBOARD_ROLES),{generation}=await searchParams;const[templates,options,questions]=await Promise.all([listTemplates(profile),listPracticeOptions(profile),generation?listGeneratedQuestions(profile,generation):Promise.resolve([])]);return <PracticeShell title="Generate Questions" description="Generate structured drafts with AI, then approve them explicitly."><AiGenerationManager templates={templates} options={options} generationId={generation} questions={questions}/></PracticeShell>}

import "server-only";
import type { AttemptSession, SubmitAttemptResult } from "@/features/practice-work/types/practice-work";
import { createClient } from "@/lib/supabase/server";
export async function startAttempt(assignmentId:string){const s=await createClient();const{data,error}=await s.rpc("start_practice_attempt",{p_assignment_id:assignmentId});if(error)throw error;return data as AttemptSession}
export async function submitAttempt(attemptId:string,answers:{questionId:string;answer:string|boolean|string[]}[]){const s=await createClient();const{data,error}=await s.rpc("submit_practice_attempt",{p_attempt_id:attemptId,p_answers:answers});if(error)throw error;return data as SubmitAttemptResult}
export async function createRetry(attemptId:string){const s=await createClient();const{data,error}=await s.rpc("create_practice_retry",{p_parent_attempt_id:attemptId});if(error)throw error;return data as AttemptSession}

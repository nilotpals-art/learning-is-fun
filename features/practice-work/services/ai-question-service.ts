import "server-only";
import type { AuthProfile } from "@/features/auth/types/auth";
import { aiGenerationSchema } from "@/features/practice-work/schemas/ai-generation-schema";
import { GeminiQuestionGenerationProvider, validateGeneratedMarks } from "@/features/practice-work/services/gemini-question-generation-provider";
import { GroqQuestionGenerationProvider } from "@/features/practice-work/services/groq-question-generation-provider";
import { normalizeQuestionText } from "@/features/practice-work/services/practice-work-service";
import type { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { AiGeneration, GeneratedQuestion, GenerationReviewContext } from "@/features/practice-work/types/practice-work";

type Input=z.infer<typeof aiGenerationSchema>;

function createQuestionGenerationProvider(){
  const hasGroq=Boolean(process.env.GROQ_API_KEY?.trim());
  const hasGemini=Boolean(process.env.GEMINI_API_KEY?.trim());
  if(hasGroq){
    const groq=new GroqQuestionGenerationProvider();
    if(!hasGemini)return groq;
    const gemini=new GeminiQuestionGenerationProvider();
    return{
      model:`groq:${groq.model}`,
      async generate(input:unknown){
        try{return await groq.generate(input)}catch(error){
          console.warn("Groq generation failed; using Gemini fallback",{groqModel:groq.model,geminiModel:gemini.model,errorCode:error instanceof Error?error.message:"UNKNOWN"});
          return gemini.generate(input);
        }
      },
    };
  }
  if(hasGemini)return new GeminiQuestionGenerationProvider();
  throw new Error("AI_GENERATION_NOT_CONFIGURED");
}

export async function generateQuestionsWithAi(profile:AuthProfile,input:Input){
  if(!profile.instituteId)throw new Error("PRACTICE_UNAUTHORIZED");
  const supabase=await createClient();
  const refs=await Promise.all([
    supabase.from("boards").select("id").eq("id",input.boardId).eq("institute_id",profile.instituteId).maybeSingle(),
    supabase.from("academic_classes").select("id").eq("id",input.classId).eq("institute_id",profile.instituteId).maybeSingle(),
    supabase.from("subjects").select("id").eq("id",input.subjectId).eq("institute_id",profile.instituteId).maybeSingle(),
  ]);
  if(refs.some(result=>result.error||!result.data))throw new Error("PRACTICE_REFERENCE_INVALID");
  const{data:template,error:tError}=await supabase.from("question_templates").select("id,name,question_type,instructions,prompt_rules,blueprint").eq("id",input.templateId).eq("institute_id",profile.instituteId).eq("is_active",true).maybeSingle();
  if(tError||!template)throw new Error("PRACTICE_TEMPLATE_INVALID");
  const provider=createQuestionGenerationProvider();
  const{data:generation,error:gError}=await supabase.from("ai_question_generations").insert({institute_id:profile.instituteId,source_type:"ai",board_id:input.boardId,class_id:input.classId,subject_id:input.subjectId,book_name:input.bookName?.toUpperCase()??null,chapter:input.chapter?.toUpperCase()??null,question_exam_date:input.questionExamDate??null,source_full_marks:input.sourceFullMarks,skill:input.skill?.toUpperCase()??null,topic:input.topic?.toUpperCase()??null,subtopic:input.subtopic?.toUpperCase()??null,template_id:input.templateId,question_count_requested:input.questionCount,difficulty:input.difficulty,custom_instruction:input.specialInstructions??null,include_answers:input.includeAnswers,include_explanations:input.includeExplanations,avoid_duplicates:input.avoidDuplicates,keep_language_simple:input.keepLanguageSimple,model:provider.model,status:"pending",created_by:profile.id}).select("id").single();
  if(gError)throw gError;
  try{
    const parsed=await provider.generate({template,context:{boardId:input.boardId,classId:input.classId,subjectId:input.subjectId,bookName:input.bookName,chapter:input.chapter,questionExamDate:input.questionExamDate,difficulty:input.difficulty},sourceFullMarks:input.sourceFullMarks,questionCount:input.questionCount,specialInstructions:input.specialInstructions,options:{includeAnswers:input.includeAnswers,includeExplanations:input.includeExplanations,avoidDuplicates:input.avoidDuplicates,keepLanguageSimple:input.keepLanguageSimple}});
    validateGeneratedMarks(parsed,input.sourceFullMarks);
    const normalized=parsed.questions.map(question=>({...question,questionText:question.questionText.trim().toUpperCase(),explanation:question.explanation.trim().toUpperCase(),options:question.options?.map(value=>value.trim().toUpperCase())??null,acceptedAnswers:question.acceptedAnswers?.map(value=>value.trim().toUpperCase())??null}));
    const normalizedTexts=normalized.map(question=>normalizeQuestionText(question.questionText));
    const{data:duplicates}=await supabase.from("question_bank").select("normalized_question_text").eq("institute_id",profile.instituteId).in("normalized_question_text",normalizedTexts);
    const duplicateSet=new Set((duplicates??[]).map(value=>value.normalized_question_text));
    const{error:insertError}=await supabase.from("ai_generated_questions").insert(normalized.map(question=>({institute_id:profile.instituteId,ai_generation_id:generation.id,question_type:question.questionType,question_text:question.questionText,options:question.options,correct_answer:question.correctAnswer,accepted_answers:question.acceptedAnswers,answer_explanation:question.explanation,difficulty:question.difficulty,suggested_marks:question.suggestedMarks,tags:question.tags,duplicate_warning:duplicateSet.has(normalizeQuestionText(question.questionText))})));
    if(insertError)throw insertError;
    await supabase.from("ai_question_generations").update({status:"review_required",generated_count:normalized.length}).eq("id",generation.id);
    return generation.id;
  }catch(error){
    await supabase.from("ai_question_generations").update({status:"failed",safe_error_code:error instanceof Error?error.message.slice(0,100):"UNKNOWN"}).eq("id",generation.id);
    throw error;
  }
}

export async function listGenerations(profile:AuthProfile):Promise<AiGeneration[]>{if(!profile.instituteId)return[];const s=await createClient();const{data,error}=await s.from("ai_question_generations").select("id,template_id,book_name,chapter,custom_instruction,model,status,question_count_requested,generated_count,approved_count,rejected_count,created_at").eq("institute_id",profile.instituteId).order("created_at",{ascending:false});if(error)throw error;return(data??[]).map(x=>({id:x.id,templateId:x.template_id,bookName:x.book_name,chapter:x.chapter,customInstruction:x.custom_instruction,model:x.model,status:x.status as AiGeneration["status"],requestedCount:x.question_count_requested,generatedCount:x.generated_count,approvedCount:x.approved_count,rejectedCount:x.rejected_count,createdAt:x.created_at}))}
export async function listGeneratedQuestions(profile:AuthProfile,generationId:string):Promise<GeneratedQuestion[]>{if(!profile.instituteId)return[];const s=await createClient();const{data,error}=await s.from("ai_generated_questions").select("id,question_type,question_text,options,correct_answer,accepted_answers,answer_explanation,difficulty,suggested_marks,tags,review_status,duplicate_warning,source_page,source_reference,source_asset_id").eq("institute_id",profile.instituteId).eq("ai_generation_id",generationId).order("created_at");if(error)throw error;return(data??[]).map(x=>({id:x.id,questionType:x.question_type as GeneratedQuestion["questionType"],questionText:x.question_text,options:x.options as string[]|null,correctAnswer:x.correct_answer as GeneratedQuestion["correctAnswer"],acceptedAnswers:x.accepted_answers as string[]|null,explanation:x.answer_explanation??"",difficulty:x.difficulty as GeneratedQuestion["difficulty"],suggestedMarks:Number(x.suggested_marks),tags:x.tags as string[],reviewStatus:x.review_status as GeneratedQuestion["reviewStatus"],duplicateWarning:x.duplicate_warning,sourcePage:x.source_page,sourceReference:x.source_reference,sourceAssetId:x.source_asset_id}))}
export async function getGenerationReviewContext(profile:AuthProfile,generationId:string):Promise<GenerationReviewContext|null>{if(!profile.instituteId)return null;const s=await createClient();const{data,error}=await s.from("ai_question_generations").select("id,source_type,status,source_full_marks,model").eq("id",generationId).eq("institute_id",profile.instituteId).maybeSingle();if(error)throw error;return data?{id:data.id,sourceType:data.source_type as "ai"|"import",status:data.status as GenerationReviewContext["status"],sourceFullMarks:data.source_full_marks===null?null:Number(data.source_full_marks),model:data.model}:null}
export async function reviewGeneratedQuestions(profile:AuthProfile,input:{generationId:string;questionIds:string[];decision:"approve"|"reject";overrideDuplicates:boolean}){if(!profile.instituteId)throw new Error("PRACTICE_UNAUTHORIZED");const s=await createClient();const{data:generation}=await s.from("ai_question_generations").select("id,source_type,board_id,class_id,subject_id,book_name,chapter,skill,topic,subtopic,template_id,source_full_marks,question_exam_date,source_file_id").eq("id",input.generationId).eq("institute_id",profile.instituteId).maybeSingle();if(!generation)throw new Error("PRACTICE_GENERATION_NOT_FOUND");const{data:questions,error}=await s.from("ai_generated_questions").select("id,question_type,question_text,options,correct_answer,accepted_answers,answer_explanation,difficulty,suggested_marks,duplicate_warning,source_page,source_asset_id").eq("ai_generation_id",generation.id).eq("institute_id",profile.instituteId).in("id",input.questionIds);if(error||!questions||questions.length!==input.questionIds.length)throw new Error("PRACTICE_GENERATED_QUESTION_INVALID");if(input.decision==="approve"){if(generation.source_type==="ai"&&generation.source_full_marks!==null){const{data:allQuestions,error:marksError}=await s.from("ai_generated_questions").select("suggested_marks").eq("ai_generation_id",generation.id).eq("institute_id",profile.instituteId);if(marksError)throw marksError;const proposed=(allQuestions??[]).reduce((sum,question)=>sum+Number(question.suggested_marks),0);if(Math.abs(proposed-Number(generation.source_full_marks))>0.001)throw new Error("GENERATED_MARKS_MISMATCH")}if(!input.overrideDuplicates&&questions.some(q=>q.duplicate_warning))throw new Error("PRACTICE_DUPLICATE_WARNING");const{error:insertError}=await s.from("question_bank").upsert(questions.map(q=>({institute_id:profile.instituteId,board_id:generation.board_id,class_id:generation.class_id,subject_id:generation.subject_id,book_name:generation.book_name,chapter:generation.chapter,skill:generation.skill,topic:generation.topic,subtopic:generation.subtopic,template_id:generation.template_id,question_type:q.question_type,question_text:q.question_text,normalized_question_text:normalizeQuestionText(q.question_text),options:q.options,correct_answer:q.correct_answer,accepted_answers:q.accepted_answers,answer_explanation:q.answer_explanation,difficulty:q.difficulty,suggested_marks:q.suggested_marks,source_full_marks:generation.source_full_marks,question_exam_date:generation.question_exam_date,source_type:generation.source_type,ai_generation_id:generation.id,source_file_id:generation.source_file_id,source_page:q.source_page,source_asset_id:q.source_asset_id,created_by:profile.id})),{onConflict:"institute_id,normalized_question_text",ignoreDuplicates:true});if(insertError)throw insertError}const status=input.decision==="approve"?"approved":"rejected";await s.from("ai_generated_questions").update({review_status:status}).in("id",input.questionIds).eq("institute_id",profile.instituteId);const{count:approved}=await s.from("ai_generated_questions").select("id",{count:"exact",head:true}).eq("ai_generation_id",generation.id).eq("review_status","approved");const{count:rejected}=await s.from("ai_generated_questions").select("id",{count:"exact",head:true}).eq("ai_generation_id",generation.id).eq("review_status","rejected");await s.from("ai_question_generations").update({status:"reviewed",approved_count:approved??0,rejected_count:rejected??0}).eq("id",generation.id);if(generation.source_file_id)await s.from("practice_question_source_files").update({status:"approved"}).eq("id",generation.source_file_id).eq("institute_id",profile.instituteId);return{approved:approved??0,rejected:rejected??0}}

export async function updateGeneratedQuestion(profile:AuthProfile,input:GeneratedQuestion){if(!profile.instituteId)throw new Error("PRACTICE_UNAUTHORIZED");const s=await createClient();const{data,error}=await s.from("ai_generated_questions").update({question_type:input.questionType,question_text:input.questionText,options:input.options,correct_answer:input.correctAnswer,accepted_answers:input.acceptedAnswers,answer_explanation:input.explanation,difficulty:input.difficulty,suggested_marks:input.suggestedMarks,source_page:input.sourcePage,source_reference:input.sourceReference,edited_question:input}).eq("id",input.id).eq("institute_id",profile.instituteId).eq("review_status","pending").select("id").maybeSingle();if(error)throw error;if(!data)throw new Error("PRACTICE_GENERATED_QUESTION_INVALID")}

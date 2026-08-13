import "server-only";

import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

import { getDocumentExtractionProvider } from "@/features/practice-work/services/document-extraction-provider";
import type { Difficulty, QuestionType } from "@/features/practice-work/types/practice-work";

export interface ExtractedDraftQuestion {
  questionType: QuestionType;
  questionText: string;
  options: string[] | null;
  correctAnswer: string;
  acceptedAnswers: string[] | null;
  explanation: string;
  difficulty: Difficulty;
  suggestedMarks: number;
  tags: string[];
  sourcePage: number | null;
  sourceReference: string | null;
  associatedImage?: Uint8Array;
  associatedImageMimeType?: "image/jpeg" | "image/png";
}

const numberPattern=/^(?:Q(?:UESTION)?\s*)?(\d+)[.)\-:]\s*(.+)$/i;
const marksPattern=/\[?\(?\s*(\d+(?:\.\d+)?)\s*(?:MARKS?|M)\s*\)?\]?\s*$/i;
const optionPattern=/^(?:\(?[A-Da-d]\)|[A-Da-d][.)])\s*(.+)$/;

function parseLines(lines:string[],page:number|null):ExtractedDraftQuestion[]{
  const result:ExtractedDraftQuestion[]=[];let current:{text:string;options:string[];marks:number;reference:string}|null=null;
  const flush=()=>{if(!current)return;result.push({questionType:current.options.length?"mcq":"short_answer",questionText:current.text.trim().toUpperCase(),options:current.options.length?current.options.map(v=>v.toUpperCase()):null,correctAnswer:"REVIEW REQUIRED",acceptedAnswers:null,explanation:"IMPORTED SUGGESTION — ADMINISTRATOR REVIEW REQUIRED.",difficulty:"intermediate",suggestedMarks:current.marks,tags:["IMPORT"],sourcePage:page,sourceReference:current.reference});current=null};
  for(const raw of lines){const line=raw.trim();if(!line)continue;const numbered=line.match(numberPattern);if(numbered){flush();const marks=numbered[2].match(marksPattern);current={text:marks?numbered[2].slice(0,marks.index).trim():numbered[2],options:[],marks:marks?Number(marks[1]):1,reference:`Question ${numbered[1]}`};continue}const option=line.match(optionPattern);if(option&&current){current.options.push(option[1]);continue}if(current){const marks=line.match(marksPattern);if(marks&&marks.index===0)current.marks=Number(marks[1]);else current.text+=` ${line}`}}
  flush();return result;
}

export async function extractQuestions(bytes:Uint8Array,mimeType:string,filename:string):Promise<ExtractedDraftQuestion[]>{
  if(mimeType==="application/pdf"){
    const parser=new PDFParse({data:bytes});try{const text=await parser.getText();const drafts=text.pages.flatMap(page=>parseLines(page.text.split(/\r?\n/),page.num));if(drafts.length)return drafts;return providerFallback(bytes,mimeType,filename,"SCANNED_PDF_REQUIRES_PROVIDER")}finally{await parser.destroy()}
  }
  if(mimeType==="application/vnd.openxmlformats-officedocument.wordprocessingml.document"){
    const result=await mammoth.extractRawText({buffer:Buffer.from(bytes)});const drafts=parseLines(result.value.split(/\r?\n/),null);if(!drafts.length)throw new Error("NO_QUESTIONS_DETECTED");return drafts;
  }
  if(mimeType==="image/jpeg"||mimeType==="image/png")return providerFallback(bytes,mimeType,filename,"IMAGE_REQUIRES_PROVIDER");
  throw new Error("UNSUPPORTED_FILE_TYPE");
}

async function providerFallback(bytes:Uint8Array,mimeType:string,filename:string,deferredCode:string):Promise<ExtractedDraftQuestion[]>{
  try{const questions=await getDocumentExtractionProvider().extractImageQuestions({bytes,mimeType,filename});if(!questions.length)throw new Error("NO_QUESTIONS_DETECTED");return questions.map(q=>({questionType:"short_answer",questionText:q.questionText.trim().toUpperCase(),options:null,correctAnswer:"REVIEW REQUIRED",acceptedAnswers:null,explanation:"IMPORTED SUGGESTION — ADMINISTRATOR REVIEW REQUIRED.",difficulty:"intermediate",suggestedMarks:1,tags:["IMPORT"],sourcePage:q.sourcePage??null,sourceReference:q.sourceReference??null,associatedImage:q.associatedImage,associatedImageMimeType:q.associatedImageMimeType}))}catch(error){if(error instanceof Error&&error.message==="DOCUMENT_EXTRACTION_PROVIDER_UNAVAILABLE")throw new Error(deferredCode);throw error}
}

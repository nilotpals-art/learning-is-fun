"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { applyFeeStructure, findFeeStructure, saveFeeStructure } from "@/features/fees/services/fee-structure-service";
import type { AdmissionFeeOverride, FeeStructure, FeeStructureActionResult } from "@/features/fees/types/fee-structure";
import { admissionFeeSelectionSchema, applyFeeStructureSchema, feeStructureSchema } from "@/features/fees/validations/fee-structure-schema";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

async function admin(){const p=await requireRole(DASHBOARD_ROLES);if(!p.instituteId)redirect("/unauthorized");return p}
function failure(error:unknown):FeeStructureActionResult{const m=error&&typeof error==="object"&&"message" in error?String(error.message):"";if(m.includes("FEES_STRUCTURE_IN_USE"))return{status:"error",message:"This Fee Structure is already in use. Use Annual Fee Update for rate changes."};if(m.includes("class_fee_structures_active_key")||m.includes("23505"))return{status:"error",message:"An active Fee Structure already exists for this Academic Year and Class."};if(m.includes("FEES_MANDATORY_ITEM_REQUIRED"))return{status:"error",message:"Mandatory Fee Heads cannot be excluded."};if(m.includes("FEES_NO_APPLICABLE_MONTHS"))return{status:"error",message:"No monthly due date remains within the selected Academic Year."};if(m.includes("FEES_RATE"))return{status:"error",message:"Please check the annual fee update details."};return{status:"error",message:"The Fee Structure operation could not be completed."}}
export async function saveClassFeeStructure(input:unknown):Promise<FeeStructureActionResult<{id:string}>>{const parsed=feeStructureSchema.safeParse(input);if(!parsed.success){const fieldErrors:Record<string,string[]>={};for(const issue of parsed.error.issues){const path=issue.path.join(".")||"form";(fieldErrors[path]??=[]).push(issue.message)}return{status:"error",message:parsed.error.issues[0]?.message??"Please correct the Fee Structure details.",fieldErrors}}const p=await admin();try{const id=await saveFeeStructure(p,parsed.data);revalidatePath("/fees/structures");return{status:"success",message:"Fee Structure saved.",data:{id}}}catch(e){return failure(e)}}
export async function loadAdmissionFeeStructure(input:unknown):Promise<FeeStructureActionResult<FeeStructure|null>>{const parsed=admissionFeeSelectionSchema.safeParse(input);if(!parsed.success)return{status:"error",message:"Select an Academic Year and Class."};const p=await admin();try{return{status:"success",message:"Fee Structure loaded.",data:await findFeeStructure(p,parsed.data.academicYearId,parsed.data.classId)}}catch(e){return failure(e)}}
export async function applyStructureToStudent(studentId:string,structureId:string,overrides:AdmissionFeeOverride[]){const parsed=applyFeeStructureSchema.safeParse({studentId,structureId,overrides});if(!parsed.success)throw new Error("FEES_STRUCTURE_SELECTION_INVALID");const p=await admin();return applyFeeStructure(p,parsed.data.studentId,parsed.data.structureId,parsed.data.overrides)}
export async function setClassFeeStructureActive(id:string,isActive:boolean):Promise<FeeStructureActionResult>{if(!/^[0-9a-f-]{36}$/i.test(id))return{status:"error",message:"Fee Structure not found."};await admin();const s=await createClient();const{error}=await s.rpc("set_class_fee_structure_active",{p_structure_id:id,p_is_active:isActive});if(error)return failure(error);revalidatePath("/fees/structures");return{status:"success",message:isActive?"Fee Structure activated.":"Fee Structure deactivated."}}

export async function updateClassFeeRates(input:{structureId:string;effectiveFrom:string;applyExisting:boolean;rates:Array<{itemId:string;amount:number}>}):Promise<FeeStructureActionResult<{affectedDueCount:number}>>{
  if(!/^[0-9a-f-]{36}$/i.test(input.structureId)||!/^\d{4}-\d{2}-\d{2}$/.test(input.effectiveFrom)||!Array.isArray(input.rates)||input.rates.length===0||input.rates.some(x=>!x.itemId||!Number.isFinite(x.amount)||x.amount<=0))return{status:"error",message:"Please enter valid class fee amounts and an effective date."};
  await admin();const s=await createClient();const{data,error}=await s.rpc("update_class_fee_rates",{p_structure_id:input.structureId,p_effective_from:input.effectiveFrom,p_apply_existing:input.applyExisting,p_rates:input.rates.map(x=>({item_id:x.itemId,amount:x.amount}))});
  if(error)return failure(error);
  ["/fees/settings","/fees/structures","/fees/student-fees","/fees/reports","/students","/student/fees","/parent/fees"].forEach(path=>revalidatePath(path));
  const affectedDueCount=Number((data as {affectedDueCount?:number})?.affectedDueCount??0);
  return{status:"success",message:input.applyExisting?`Class fees updated. ${affectedDueCount} existing unpaid monthly due${affectedDueCount===1?"":"s"} updated.`:"Class fees updated for new admissions and future assignments.",data:{affectedDueCount}};
}

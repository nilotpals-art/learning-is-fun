"use server";

import { revalidatePath } from "next/cache";
import { deliverPaymentConfirmationImmediately } from "@/features/fees/services/fee-worker-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

function one<T>(v:T|T[]|null|undefined):T|null{return !v?null:Array.isArray(v)?v[0]??null:v}
function esc(v:string){return v.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}
function origin(){const x=process.env.NEXT_PUBLIC_APP_URL??process.env.APP_URL??(process.env.VERCEL_PROJECT_PRODUCTION_URL?`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`:null);return (x??"https://learning-is-fun-ha98.vercel.app").replace(/\/$/,"")}

export async function sendVerifiedFeeReceipt(input:{paymentId:string;channel:"whatsapp"|"email"|"both"}){
 const profile=await requireRole(DASHBOARD_ROLES); if(!profile.instituteId)return {status:"error" as const,message:"Institute not found."};
 const sb=await createClient();
 const {data:p,error}=await sb.from("fee_payments").select("id,student_id,payment_date,amount,receipt_no,reference_no,status,payment_mode_id,student:students!fee_payments_student_id_fkey(name,admission_no),mode:payment_modes!fee_payments_mode_fkey(name)").eq("institute_id",profile.instituteId).eq("id",input.paymentId).maybeSingle();
 if(error){console.error("Fee receipt payment lookup failed",{code:error.code});return {status:"error" as const,message:"Unable to load this payment receipt. Please try again."};}
 if(!p||p.status!=="posted")return {status:"error" as const,message:"Posted payment not found."};
 const student=one(p.student); const mode=one(p.mode);
 const {data:parents}=await sb.from("student_parent_links").select("parent:parents!student_parent_links_parent_fkey(id,name,email,mobile,is_active)").eq("institute_id",profile.instituteId).eq("student_id",p.student_id);
 const parent=(parents??[]).map(x=>one(x.parent)).find(x=>x?.is_active)??null;
 if(!parent)return {status:"error" as const,message:"No active parent contact is linked to this student."};
 const {data:allocs,error:allocError}=await sb.from("fee_payment_allocations").select("amount,due:student_fee_dues!fee_payment_allocations_due_fkey(due_date,assignment:student_fee_assignments!student_fee_dues_assignment_fkey(head:fee_heads!student_fee_assignments_fee_head_id_fkey(name),structure_item:class_fee_structure_items!student_fee_assignments_class_fee_structure_item_id_fkey(schedule_type)))").eq("fee_payment_id",p.id);
 if(allocError)console.error("Fee receipt allocation lookup failed",{code:allocError.code});
 const month=new Intl.DateTimeFormat("en-IN",{month:"long",year:"numeric",timeZone:"Asia/Kolkata"});
 const items=(allocs??[]).map(a=>{const d=one(a.due);const asn=one(d?.assignment);const head=one(asn?.head)?.name??"Fee";const monthly=one(asn?.structure_item)?.schedule_type==="monthly";return {label:monthly&&d?.due_date?`${head} for ${month.format(new Date(`${d.due_date}T00:00:00+05:30`))}`:head,amount:Number(a.amount)}});
 const paymentFor=items.map(x=>x.label).join(", ")||"Fee Payment";
 const notes:string[]=[];
 if(input.channel==="whatsapp"||input.channel==="both"){
   if(!parent.mobile)notes.push("Parent WhatsApp number is unavailable."); else {
     const {data,error:e}=await sb.rpc("fee_queue_confirmation",{p_payment_id:p.id,p_institute_id:profile.instituteId,p_student_id:p.student_id,p_initiated_by:profile.id});
     if(e){console.error("Fee WhatsApp confirmation preparation failed",{code:e.code});notes.push("WhatsApp confirmation could not be prepared.");}
     else if(data!=="queued"&&data!=="already_queued"){notes.push("Parent WhatsApp number is unavailable.");}
     else {
       try{
         const delivery=await deliverPaymentConfirmationImmediately(p.id,profile.instituteId);
         if(delivery.sent>0)notes.push("WhatsApp receipt sent to parent.");
         else if(data==="already_queued"&&delivery.failed===0&&delivery.skipped===0)notes.push("WhatsApp receipt was already sent.");
         else notes.push("WhatsApp receipt could not be sent immediately.");
       }catch(err){console.error("Immediate fee WhatsApp delivery failed",err);notes.push("WhatsApp receipt could not be sent immediately.");}
     }
   }
 }
 if(input.channel==="email"||input.channel==="both"){
   const key=process.env.BREVO_API_KEY;const from=process.env.BREVO_SENDER_EMAIL??process.env.BREVO_FROM_EMAIL??process.env.EMAIL_FROM;
   if(!parent.email)notes.push("Parent email is unavailable."); else if(!key||!from)notes.push("Brevo email settings are unavailable."); else {
    const money=new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR"});const dt=new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeZone:"Asia/Kolkata"});const receiptUrl=`${origin()}/fees/receipts/${p.id}`;
    const rows=items.map(x=>`<tr><td style="padding:8px;border-bottom:1px solid #ddd">${esc(x.label)}</td><td style="padding:8px;border-bottom:1px solid #ddd;text-align:right">${esc(money.format(x.amount))}</td></tr>`).join("");
    const html=`<div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;color:#172033"><h2>FEE PAYMENT RECEIVED</h2><p><b>Student:</b> ${esc(student?.name??"Student")}</p><p><b>Roll No:</b> ${esc(student?.admission_no??"—")}</p><p><b>Date of Payment:</b> ${esc(dt.format(new Date(p.payment_date)))}</p><p><b>Payment For:</b> ${esc(paymentFor)}</p><p><b>Mode of Payment:</b> ${esc(mode?.name??"—")}</p><p><b>Amount Paid:</b> ${esc(money.format(Number(p.amount)))}</p><p><b>Receipt No:</b> ${esc(p.receipt_no)}</p><table style="width:100%;border-collapse:collapse;margin-top:16px">${rows}</table><p style="margin-top:20px"><a href="${esc(receiptUrl)}">View / Print / Save Receipt</a></p><p>Thank you.<br><b>${esc(profile.instituteName??"Learning Is Fun")}</b></p></div>`;
    try{const r=await fetch("https://api.brevo.com/v3/smtp/email",{method:"POST",headers:{"api-key":key,"content-type":"application/json",accept:"application/json"},body:JSON.stringify({sender:{name:profile.instituteName??"Learning Is Fun",email:from},to:[{email:parent.email,name:parent.name??undefined}],subject:`Fee Receipt ${p.receipt_no} - ${profile.instituteName??"Learning Is Fun"}`,htmlContent:html})});notes.push(r.ok?"Email receipt sent to parent.":"Email receipt could not be sent.")}catch{notes.push("Email receipt could not be sent.")}
   }
 }
 revalidatePath("/fees/payments");revalidatePath("/fees/messages");
 return {status:"success" as const,message:notes.join(" ")};
}

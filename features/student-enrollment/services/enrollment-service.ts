import "server-only";

import { createHash, randomBytes, randomInt } from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { normalizeEmail, normalizeUpperText } from "@/lib/validation/normalization";
import { createManagedAuthUser, deleteManagedAuthUser, findManagedAuthUserByEmail } from "@/lib/supabase/admin";

export type EnrollmentPurpose = "STUDENT" | "PARENT";

export interface EnrollmentInviteView {
  token: string;
  parentMobile: string;
  academicYearName: string;
  className: string;
  status: string;
  expiresAt: string;
  studentEmailVerified: string | null;
  parentEmailVerified: string | null;
  feeItems: Array<{ id: string; name: string; amount: number; feeNature: string; scheduleType: string }>;
  securityDepositAmount: number;
  submittedAdmissionNumber?: string | null;
  submittedAt?: string | null;
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Enrollment service is not configured.");
  return createSupabaseClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
}

export function enrollmentTokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }
function otpHash(inviteId: string, purpose: EnrollmentPurpose, email: string, code: string) {
  const secret = process.env.ENROLLMENT_OTP_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Enrollment OTP secret is not configured.");
  return createHash("sha256").update(`${inviteId}:${purpose}:${email}:${code}:${secret}`).digest("hex");
}

export async function createEnrollmentInvite(input:{instituteId:string;createdBy:string;parentMobile:string;academicYearId:string;classId:string;feeStructureId:string;expiresAt:string}) {
  const token=randomBytes(32).toString("base64url"), supabase=adminClient();
  const {error}=await supabase.from("student_enrollment_invites").insert({institute_id:input.instituteId,created_by:input.createdBy,token_hash:enrollmentTokenHash(token),parent_mobile:input.parentMobile,academic_year_id:input.academicYearId,class_id:input.classId,fee_structure_id:input.feeStructureId,expires_at:input.expiresAt});
  if(error)throw error; return token;
}

export async function deleteEnrollmentInvite(instituteId:string, inviteId:string) {
  const supabase=adminClient();
  const {error}=await supabase.from("student_enrollment_invites").delete().eq("id",inviteId).eq("institute_id",instituteId);
  if(error)throw error;
}

export async function listEnrollmentInvites(instituteId:string) {
  const supabase=adminClient();
  const {data,error}=await supabase.from("student_enrollment_invites").select("id,parent_mobile,status,expires_at,submitted_at,created_at,year:academic_years(name),class:academic_classes(class_name),student:students(admission_no,name)").eq("institute_id",instituteId).order("created_at",{ascending:false}).limit(100);
  if(error)throw error; return data??[];
}

export async function loadEnrollmentInvite(token:string):Promise<EnrollmentInviteView|null> {
  const supabase=adminClient();
  const {data,error}=await supabase.from("student_enrollment_invites").select("id,parent_mobile,status,expires_at,verified_student_email,verified_parent_email,submitted_at,fee_structure_id,year:academic_years(name),class:academic_classes(class_name),student:students(admission_no),structure:class_fee_structures(items:class_fee_structure_items(id,amount,schedule_type,head:fee_heads(name,fee_nature)))").eq("token_hash",enrollmentTokenHash(token)).maybeSingle();
  if(error)throw error; if(!data)return null;
  const first=<T,>(value:T|T[]|null|undefined):T|null=>!value?null:Array.isArray(value)?value[0]??null:value;
  const structure=first(data.structure as unknown as {items?:Array<{id:string;amount:number;schedule_type:string;head:{name:string;fee_nature:string}|Array<{name:string;fee_nature:string}>|null}>}|null);
  const feeItems=(structure?.items??[]).map((item)=>{const head=first(item.head);return{id:item.id,name:head?.name??"FEE",amount:Number(item.amount),feeNature:head?.fee_nature??"regular",scheduleType:item.schedule_type};});
  let securityDepositAmount=0; const {data:monthlyBase}=await supabase.rpc("class_monthly_fee_on_date",{p_structure_id:data.fee_structure_id,p_on_date:new Date().toISOString().slice(0,10)}); if(feeItems.some((item)=>item.feeNature==="refundable_deposit"))securityDepositAmount=Number(monthlyBase??0);
  return{token,parentMobile:data.parent_mobile,academicYearName:first(data.year as unknown as {name:string}|{name:string}[]|null)?.name??"",className:first(data.class as unknown as {class_name:string}|{class_name:string}[]|null)?.class_name??"",status:data.status,expiresAt:data.expires_at,studentEmailVerified:data.verified_student_email,parentEmailVerified:data.verified_parent_email,feeItems,securityDepositAmount,submittedAdmissionNumber:first(data.student as unknown as {admission_no:string}|{admission_no:string}[]|null)?.admission_no??null,submittedAt:data.submitted_at};
}

async function sendBrevoOtp(email:string,code:string,purpose:EnrollmentPurpose){const apiKey=process.env.BREVO_API_KEY,senderEmail=process.env.ENROLLMENT_EMAIL_FROM;if(!apiKey||!senderEmail)throw new Error("Enrollment email delivery is not configured.");const response=await fetch("https://api.brevo.com/v3/smtp/email",{method:"POST",headers:{"api-key":apiKey,"content-type":"application/json",accept:"application/json"},body:JSON.stringify({sender:{name:"Learning Is Fun",email:senderEmail},to:[{email}],subject:`${purpose==="STUDENT"?"Student":"Parent"} email verification code`,htmlContent:`<p>Your Learning Is Fun verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>This code expires in 10 minutes.</p>`})});if(!response.ok)throw new Error("Could not send verification email.");}

export async function requestEnrollmentOtp(token:string,purpose:EnrollmentPurpose,rawEmail:string){const email=normalizeEmail(rawEmail),supabase=adminClient();const{data:invite,error}=await supabase.from("student_enrollment_invites").select("id,status,expires_at").eq("token_hash",enrollmentTokenHash(token)).maybeSingle();if(error)throw error;if(!invite||invite.status!=="ACTIVE"||new Date(invite.expires_at)<=new Date())throw new Error("This enrollment link is not active.");const{data:existing}=await supabase.from("student_enrollment_email_otps").select("sent_at").eq("invite_id",invite.id).eq("purpose",purpose).maybeSingle();if(existing&&Date.now()-new Date(existing.sent_at).getTime()<60_000)throw new Error("Please wait before requesting another OTP.");const code=randomInt(100000,1000000).toString(),now=new Date(),expires=new Date(now.getTime()+10*60_000);const{error:upsertError}=await supabase.from("student_enrollment_email_otps").upsert({invite_id:invite.id,purpose,email,code_hash:otpHash(invite.id,purpose,email,code),expires_at:expires.toISOString(),attempt_count:0,sent_at:now.toISOString(),consumed_at:null,updated_at:now.toISOString()},{onConflict:"invite_id,purpose"});if(upsertError)throw upsertError;await sendBrevoOtp(email,code,purpose);}

export async function verifyEnrollmentOtp(token:string,purpose:EnrollmentPurpose,rawEmail:string,code:string){const email=normalizeEmail(rawEmail),supabase=adminClient();const{data:invite,error}=await supabase.from("student_enrollment_invites").select("id,status,expires_at").eq("token_hash",enrollmentTokenHash(token)).maybeSingle();if(error)throw error;if(!invite||invite.status!=="ACTIVE"||new Date(invite.expires_at)<=new Date())throw new Error("This enrollment link is not active.");const{data:otp,error:otpError}=await supabase.from("student_enrollment_email_otps").select("id,email,code_hash,expires_at,attempt_count,consumed_at").eq("invite_id",invite.id).eq("purpose",purpose).maybeSingle();if(otpError)throw otpError;if(!otp||otp.email!==email||otp.consumed_at||new Date(otp.expires_at)<=new Date())throw new Error("OTP is invalid or expired.");if(otp.attempt_count>=5)throw new Error("Too many incorrect attempts. Request a new OTP.");if(otp.code_hash!==otpHash(invite.id,purpose,email,code.trim())){await supabase.from("student_enrollment_email_otps").update({attempt_count:otp.attempt_count+1,updated_at:new Date().toISOString()}).eq("id",otp.id);throw new Error("OTP is incorrect.");}const verifiedField=purpose==="STUDENT"?"verified_student_email":"verified_parent_email",verifiedAtField=purpose==="STUDENT"?"student_email_verified_at":"parent_email_verified_at",now=new Date().toISOString();const{error:verifyError}=await supabase.from("student_enrollment_invites").update({[verifiedField]:email,[verifiedAtField]:now,updated_at:now}).eq("id",invite.id);if(verifyError)throw verifyError;await supabase.from("student_enrollment_email_otps").update({consumed_at:now,updated_at:now}).eq("id",otp.id);return email;}

export async function submitEnrollment(token:string,input:{name:string;motherName?:string;gender:string;dateOfBirth:string;studentMobile:string;studentEmail:string|null;schoolName?:string;address?:string;parentName:string;relationship:string;parentEmail:string|null;parentRequest?:string;rulesAccepted:boolean}){
  const supabase=adminClient();
  const{data,error}=await supabase.rpc("submit_parent_enrollment",{p_token_hash:enrollmentTokenHash(token),p_name:normalizeUpperText(input.name),p_mother_name:normalizeUpperText(input.motherName??""),p_gender:input.gender,p_date_of_birth:input.dateOfBirth,p_student_mobile:input.studentMobile,p_student_email:input.studentEmail?normalizeEmail(input.studentEmail):null,p_school_name:normalizeUpperText(input.schoolName??""),p_address:normalizeUpperText(input.address??""),p_parent_name:normalizeUpperText(input.parentName),p_relationship:input.relationship,p_parent_email:input.parentEmail?normalizeEmail(input.parentEmail):null,p_parent_request:normalizeUpperText(input.parentRequest??""),p_rules_accepted:input.rulesAccepted});if(error)throw error;return data as{student_id:string;parent_id:string;parent_created:boolean;admission_no:string;enrollment_date:string};
}

type PortalDomain={id:string;institute_id:string;name:string;mobile:string;email:string|null;profile_id:string|null;is_active?:boolean};
async function ensureEnrollmentPortalIdentity(input:{table:"students"|"parents";id:string;email:string|null;role:"Student"|"Parent"}){if(!input.email)return;const email=normalizeEmail(input.email),supabase=adminClient();const selectFields=input.table==="parents"?"id,institute_id,name,mobile,email,profile_id,is_active":"id,institute_id,name,mobile,email,profile_id";const{data,error:domainError}=await supabase.from(input.table).select(selectFields).eq("id",input.id).maybeSingle();if(domainError)throw domainError;if(!data)throw new Error(`${input.role} record is unavailable for portal provisioning.`);const domain=data as unknown as PortalDomain;if(domain.email!==email)throw new Error(`${input.role} email changed before portal provisioning.`);if(domain.profile_id)return;const{data:existingProfile,error:profileLookupError}=await supabase.from("profiles").select("id").eq("email",email).maybeSingle();if(profileLookupError)throw profileLookupError;if(existingProfile)throw new Error(`A portal profile already uses ${email}.`);if(await findManagedAuthUserByEmail(email))throw new Error(`An Auth account already uses ${email}.`);const{data:roleRow,error:roleError}=await supabase.from("roles").select("id").eq("name",input.role).maybeSingle();if(roleError)throw roleError;if(!roleRow)throw new Error(`${input.role} role is not configured.`);const authUser=await createManagedAuthUser(email);let profileCreated=false;try{const{error:insertProfileError}=await supabase.from("profiles").insert({id:authUser.id,institute_id:domain.institute_id,name:domain.name,mobile:domain.mobile,role:input.role,role_id:roleRow.id,is_active:input.role==="Parent"?domain.is_active!==false:true,email});if(insertProfileError)throw insertProfileError;profileCreated=true;const{error:linkError}=await supabase.from(input.table).update({profile_id:authUser.id,updated_at:new Date().toISOString()}).eq("id",input.id).is("profile_id",null);if(linkError)throw linkError;}catch(error){if(profileCreated)await supabase.from("profiles").delete().eq("id",authUser.id);await deleteManagedAuthUser(authUser.id);throw error;}}
export async function provisionEnrollmentPortalIdentities(input:{studentId:string;parentId:string;studentEmail:string|null;parentEmail:string|null}){await ensureEnrollmentPortalIdentity({table:"students",id:input.studentId,email:input.studentEmail,role:"Student"});await ensureEnrollmentPortalIdentity({table:"parents",id:input.parentId,email:input.parentEmail,role:"Parent"});}

import "server-only";

import { createClient } from "@supabase/supabase-js";

export const FACEBOOK_ENQUIRY_STATUSES = ["New", "Contacted", "Enrolled", "Closed"] as const;
export type FacebookEnquiryStatus = (typeof FACEBOOK_ENQUIRY_STATUSES)[number];

export type FacebookEnquiry = {
  id: string;
  institute_id: string;
  student_name: string;
  class_name: string;
  board: "ICSE" | "ISC" | "CBSE";
  contact_no: string;
  callback_time: "Morning" | "Afternoon" | "Evening" | "Anytime";
  source: string;
  status: FacebookEnquiryStatus;
  internal_note: string | null;
  created_at: string;
  updated_at: string;
};

function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Supabase admin database is not configured.");
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

export async function getDefaultInstituteId() {
  const db = adminDb();
  const { data, error } = await db.from("institutes").select("id").order("created_at", { ascending: true }).limit(1).single();
  if (error || !data?.id) throw new Error("Institute is not configured.");
  return data.id as string;
}

export async function createFacebookEnquiry(input: {
  instituteId: string;
  studentName: string;
  className: string;
  board: "ICSE" | "ISC" | "CBSE";
  contactNo: string;
  callbackTime: "Morning" | "Afternoon" | "Evening" | "Anytime";
}) {
  const db = adminDb();
  const { data, error } = await db
    .from("facebook_enquiries")
    .insert({
      institute_id: input.instituteId,
      student_name: input.studentName,
      class_name: input.className,
      board: input.board,
      contact_no: input.contactNo,
      callback_time: input.callbackTime,
      source: "Facebook",
      status: "New",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data;
}

export async function listFacebookEnquiries(instituteId: string): Promise<FacebookEnquiry[]> {
  const db = adminDb();
  const { data, error } = await db
    .from("facebook_enquiries")
    .select("*")
    .eq("institute_id", instituteId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as FacebookEnquiry[];
}

export async function updateFacebookEnquiry(
  instituteId: string,
  id: string,
  values: { status: FacebookEnquiryStatus; internalNote: string }
) {
  const db = adminDb();
  const { error } = await db
    .from("facebook_enquiries")
    .update({
      status: values.status,
      internal_note: values.internalNote.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("institute_id", instituteId);
  if (error) throw error;
}

export async function deleteFacebookEnquiry(instituteId: string, id: string) {
  const db = adminDb();
  const { error } = await db.from("facebook_enquiries").delete().eq("id", id).eq("institute_id", instituteId);
  if (error) throw error;
}

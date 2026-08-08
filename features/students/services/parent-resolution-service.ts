import "server-only";

import { createClient } from "@/lib/supabase/server";
import { normalizeEmail, normalizeTrimmedText, normalizeUpperText } from "@/lib/validation/normalization";

export interface ParentResolution {
  id: string;
  name: string;
  mobile: string;
  email: string;
  linkedChildCount: number;
  matches: boolean;
}

export async function resolveParentByEmail(
  instituteId: string,
  email: string,
  submittedName: string,
  submittedMobile: string
): Promise<ParentResolution | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parents")
    .select("id, name, mobile, email")
    .eq("institute_id", instituteId)
    .eq("email", normalizeEmail(email))
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { count, error: countError } = await supabase
    .from("student_parent_links")
    .select("id", { count: "exact", head: true })
    .eq("institute_id", instituteId)
    .eq("parent_id", data.id);
  if (countError) throw countError;

  return {
    id: data.id as string,
    name: data.name as string,
    mobile: data.mobile as string,
    email: data.email as string,
    linkedChildCount: count ?? 0,
    matches:
      normalizeUpperText(data.name as string) === normalizeUpperText(submittedName) &&
      normalizeTrimmedText(data.mobile as string) === normalizeTrimmedText(submittedMobile),
  };
}

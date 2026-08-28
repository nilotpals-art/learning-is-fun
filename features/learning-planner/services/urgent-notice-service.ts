import "server-only";

import type { AuthProfile } from "@/features/auth/types/auth";
import { isAdministratorRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export type UrgentNotice = {
  id: string;
  title: string;
  message: string;
  targetAudience: "Student" | "Parent" | "Both";
  startAt: string;
  endAt: string | null;
  mustAcknowledge: boolean;
  isActive: boolean;
  createdAt: string;
};

function mapNotice(row: any): UrgentNotice {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    targetAudience: row.target_audience,
    startAt: row.start_at,
    endAt: row.end_at,
    mustAcknowledge: row.must_acknowledge,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export async function listAdminUrgentNotices(profile: AuthProfile): Promise<UrgentNotice[]> {
  if (!isAdministratorRole(profile.role) || !profile.instituteId) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("urgent_notices")
    .select("id,title,message,target_audience,start_at,end_at,must_acknowledge,is_active,created_at")
    .eq("institute_id", profile.instituteId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapNotice);
}

export async function listPendingUrgentNotices(profile: AuthProfile): Promise<UrgentNotice[]> {
  if ((profile.role !== "Student" && profile.role !== "Parent") || !profile.instituteId) return [];
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("urgent_notices")
    .select("id,title,message,target_audience,start_at,end_at,must_acknowledge,is_active,created_at")
    .eq("institute_id", profile.instituteId)
    .eq("is_active", true)
    .lte("start_at", now)
    .or(`end_at.is.null,end_at.gt.${now}`)
    .in("target_audience", [profile.role, "Both"])
    .order("start_at", { ascending: true });
  if (error) throw error;
  if (!data?.length) return [];

  const { data: acknowledgements, error: ackError } = await supabase
    .from("urgent_notice_acknowledgements")
    .select("notice_id")
    .eq("user_id", profile.id)
    .in("notice_id", data.map((row) => row.id));
  if (ackError) throw ackError;
  const acknowledged = new Set((acknowledgements ?? []).map((row) => row.notice_id));
  return data.filter((row) => !acknowledged.has(row.id)).map(mapNotice);
}

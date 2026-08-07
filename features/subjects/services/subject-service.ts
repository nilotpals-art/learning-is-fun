import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Subject } from "@/features/subjects/types/subject";

interface SubjectRecord {
  id: string;
  subject_name: string;
  created_at: string | null;
}

function toSubject(record: SubjectRecord): Subject {
  return {
    id: record.id,
    subjectName: record.subject_name,
    createdAt: record.created_at,
  };
}

function normalizeSubjectName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

export async function listSubjects(instituteId: string): Promise<Subject[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subjects")
    .select("id, subject_name, created_at")
    .eq("institute_id", instituteId)
    .order("subject_name", { ascending: true });

  if (error) throw error;
  return (data as SubjectRecord[]).map(toSubject);
}

export async function getSubject(
  instituteId: string,
  id: string
): Promise<Subject | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subjects")
    .select("id, subject_name, created_at")
    .eq("institute_id", instituteId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? toSubject(data as SubjectRecord) : null;
}

export async function subjectNameExists(
  instituteId: string,
  subjectName: string,
  excludedId?: string
): Promise<boolean> {
  const supabase = await createClient();
  let query = supabase
    .from("subjects")
    .select("id, subject_name")
    .eq("institute_id", instituteId);

  if (excludedId) query = query.neq("id", excludedId);

  const { data, error } = await query;
  if (error) throw error;

  const normalizedName = normalizeSubjectName(subjectName);
  return (data ?? []).some(
    (subject) =>
      normalizeSubjectName(subject.subject_name as string) === normalizedName
  );
}

export async function insertSubject(
  instituteId: string,
  subjectName: string
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("subjects").insert({
    institute_id: instituteId,
    subject_name: subjectName,
  });

  if (error) throw error;
}

export async function updateSubjectRecord(
  instituteId: string,
  id: string,
  subjectName: string
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subjects")
    .update({ subject_name: subjectName })
    .eq("institute_id", instituteId)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { AcademicYear } from "@/features/academic-years/types/academic-year";
import type { AcademicYearFormValues } from "@/features/academic-years/validations/academic-year-schema";

interface AcademicYearRecord {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

function toAcademicYear(record: AcademicYearRecord): AcademicYear {
  return {
    id: record.id,
    name: record.name,
    startDate: record.start_date,
    endDate: record.end_date,
    isCurrent: record.is_current,
    isActive: record.is_active,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export async function listAcademicYears(
  instituteId: string
): Promise<AcademicYear[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academic_years")
    .select(
      "id, name, start_date, end_date, is_current, is_active, created_at, updated_at"
    )
    .eq("institute_id", instituteId)
    .order("start_date", { ascending: false });

  if (error) throw error;
  return (data as AcademicYearRecord[]).map(toAcademicYear);
}

export async function getAcademicYear(
  instituteId: string,
  id: string
): Promise<AcademicYear | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academic_years")
    .select(
      "id, name, start_date, end_date, is_current, is_active, created_at, updated_at"
    )
    .eq("institute_id", instituteId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? toAcademicYear(data as AcademicYearRecord) : null;
}

export async function insertAcademicYear(
  instituteId: string,
  values: AcademicYearFormValues
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("academic_years").insert({
    institute_id: instituteId,
    name: values.name,
    start_date: values.startDate,
    end_date: values.endDate,
    is_active: values.isActive,
    is_current: false,
  });
  if (error) throw error;
}

export async function updateAcademicYearRecord(
  instituteId: string,
  id: string,
  values: AcademicYearFormValues
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academic_years")
    .update({
      name: values.name,
      start_date: values.startDate,
      end_date: values.endDate,
      is_active: values.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("institute_id", instituteId)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function updateAcademicYearActiveState(
  instituteId: string,
  id: string,
  isActive: boolean
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academic_years")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("institute_id", instituteId)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function switchCurrentAcademicYear(
  instituteId: string,
  id: string
): Promise<boolean> {
  const supabase = await createClient();
  const { data: previous, error: readError } = await supabase
    .from("academic_years")
    .select("id")
    .eq("institute_id", instituteId)
    .eq("is_current", true)
    .neq("id", id);
  if (readError) throw readError;

  const previousIds = (previous ?? []).map((year) => year.id as string);
  if (previousIds.length > 0) {
    const { error: unsetError } = await supabase
      .from("academic_years")
      .update({ is_current: false, updated_at: new Date().toISOString() })
      .eq("institute_id", instituteId)
      .in("id", previousIds);
    if (unsetError) throw unsetError;
  }

  const { data, error: setError } = await supabase
    .from("academic_years")
    .update({ is_current: true, updated_at: new Date().toISOString() })
    .eq("institute_id", instituteId)
    .eq("id", id)
    .eq("is_active", true)
    .select("id")
    .maybeSingle();

  if (setError || !data) {
    if (previousIds.length > 0) {
      await supabase
        .from("academic_years")
        .update({ is_current: true, updated_at: new Date().toISOString() })
        .eq("institute_id", instituteId)
        .in("id", previousIds);
    }
    if (setError) throw setError;
    return false;
  }

  return true;
}

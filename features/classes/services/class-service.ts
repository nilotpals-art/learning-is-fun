import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { AcademicClass } from "@/features/classes/types/academic-class";
import type { ClassFormValues } from "@/features/classes/validations/class-schema";
import { normalizeUpperText } from "@/lib/validation/normalization";

interface AcademicClassRecord {
  id: string;
  class_name: string;
  display_order: number | null;
  created_at: string | null;
}

function toAcademicClass(record: AcademicClassRecord): AcademicClass {
  return {
    id: record.id,
    className: record.class_name,
    displayOrder: record.display_order,
    createdAt: record.created_at,
  };
}

function normalizeClassName(name: string): string {
  return normalizeUpperText(name);
}

function toDisplayOrder(value: string): number | null {
  return value === "" ? null : Number(value);
}

export async function listAcademicClasses(
  instituteId: string
): Promise<AcademicClass[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academic_classes")
    .select("id, class_name, display_order, created_at")
    .eq("institute_id", instituteId)
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("class_name", { ascending: true });

  if (error) throw error;
  return (data as AcademicClassRecord[]).map(toAcademicClass);
}

export async function getAcademicClass(
  instituteId: string,
  id: string
): Promise<AcademicClass | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academic_classes")
    .select("id, class_name, display_order, created_at")
    .eq("institute_id", instituteId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? toAcademicClass(data as AcademicClassRecord) : null;
}

export async function academicClassNameExists(
  instituteId: string,
  className: string,
  excludedId?: string
): Promise<boolean> {
  const supabase = await createClient();
  let query = supabase
    .from("academic_classes")
    .select("id, class_name")
    .eq("institute_id", instituteId);

  if (excludedId) query = query.neq("id", excludedId);

  const { data, error } = await query;
  if (error) throw error;

  const normalizedName = normalizeClassName(className);
  return (data ?? []).some(
    (academicClass) =>
      normalizeClassName(academicClass.class_name as string) === normalizedName
  );
}

export async function insertAcademicClass(
  instituteId: string,
  values: ClassFormValues
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("academic_classes").insert({
    institute_id: instituteId,
    class_name: normalizeUpperText(values.className),
    display_order: toDisplayOrder(values.displayOrder),
  });

  if (error) throw error;
}

export async function updateAcademicClassRecord(
  instituteId: string,
  id: string,
  values: ClassFormValues
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academic_classes")
    .update({
      class_name: normalizeUpperText(values.className),
      display_order: toDisplayOrder(values.displayOrder),
    })
    .eq("institute_id", instituteId)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function deleteAcademicClassRecord(
  instituteId: string,
  id: string
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academic_classes")
    .delete()
    .eq("institute_id", instituteId)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

import "server-only";

import type {
  StudentAcademicYearOption,
  StudentRecord,
  StudentStatus,
} from "@/features/students/types/student";
import type {
  StudentCreateValues,
  StudentEditValues,
} from "@/features/students/validations/student-schema";
import { createClient } from "@/lib/supabase/server";
import { normalizeEmail, normalizeTrimmedText, normalizeUpperText } from "@/lib/validation/normalization";

interface AdmissionFoundationResult {
  student_id: string;
  parent_id: string;
  parent_created: boolean;
  admission_no: string;
}

interface StudentQueryRecord {
  id: string;
  admission_no: string;
  name: string;
  mother_name: string | null;
  date_of_birth: string;
  gender: string;
  mobile: string;
  email: string;
  address: string | null;
  admission_date: string;
  status: StudentStatus;
  comments: string | null;
  links:
    | Array<{
        relationship: string;
        parent: { id: string; name: string; mobile: string; email: string } | null;
      }>
    | null;
}

function toStudent(record: StudentQueryRecord): StudentRecord {
  const link = record.links?.[0];
  const parent = link?.parent;
  return {
    id: record.id,
    admissionNumber: record.admission_no,
    name: record.name,
    motherName: record.mother_name,
    dateOfBirth: record.date_of_birth,
    gender: record.gender,
    mobile: record.mobile,
    email: record.email,
    address: record.address,
    admissionDate: record.admission_date,
    status: record.status,
    comments: record.comments,
    parentId: parent?.id ?? "",
    parentName: parent?.name ?? "Not available",
    parentMobile: parent?.mobile ?? "Not available",
    parentEmail: parent?.email ?? "Not available",
    relationship: link?.relationship ?? "Not available",
  };
}

const STUDENT_SELECT =
  "id, admission_no, name, mother_name, date_of_birth, gender, mobile, email, address, admission_date, status, comments, links:student_parent_links(relationship, parent:parents(id, name, mobile, email))";

export async function listStudents(instituteId: string): Promise<StudentRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select(STUDENT_SELECT)
    .eq("institute_id", instituteId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as StudentQueryRecord[]).map(toStudent);
}

export async function getStudent(
  instituteId: string,
  id: string
): Promise<StudentRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select(STUDENT_SELECT)
    .eq("institute_id", instituteId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toStudent(data as unknown as StudentQueryRecord) : null;
}

export async function listActiveAcademicYears(
  instituteId: string
): Promise<StudentAcademicYearOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academic_years")
    .select("id, name, is_current")
    .eq("institute_id", instituteId)
    .eq("is_active", true)
    .order("start_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((year) => ({
    id: year.id as string,
    name: year.name as string,
    isCurrent: year.is_current === true,
  }));
}

export async function studentEmailExists(email: string): Promise<boolean> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("email", normalizeEmail(email));
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function createAdmissionFoundation(
  values: StudentCreateValues,
  parentId: string | null
): Promise<AdmissionFoundationResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_student_admission_foundation", {
    p_academic_year_id: values.academicYearId,
    p_name: normalizeUpperText(values.name),
    p_mother_name: normalizeUpperText(values.motherName),
    p_gender: values.gender,
    p_date_of_birth: values.dateOfBirth,
    p_mobile: normalizeTrimmedText(values.mobile),
    p_email: normalizeEmail(values.email),
    p_address: normalizeUpperText(values.address),
    p_admission_date: values.admissionDate,
    p_status: values.status,
    p_comments: normalizeUpperText(values.comments),
    p_parent_id: parentId,
    p_parent_name: normalizeUpperText(values.parentName),
    p_parent_mobile: normalizeTrimmedText(values.parentMobile),
    p_parent_email: normalizeEmail(values.parentEmail),
    p_relationship: values.relationship,
  });
  if (error) throw error;
  return data as AdmissionFoundationResult;
}

export async function compensateAdmissionFoundation(
  result: AdmissionFoundationResult
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("compensate_student_admission_foundation", {
    p_student_id: result.student_id,
    p_parent_id: result.parent_id,
    p_parent_created: result.parent_created,
  });
  if (error) throw error;
}

export async function getIdentityProfileId(
  instituteId: string,
  table: "students" | "parents",
  id: string
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(table)
    .select("profile_id")
    .eq("institute_id", instituteId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data?.profile_id as string | null | undefined) ?? null;
}

export async function updateStudentRecord(
  instituteId: string,
  id: string,
  values: StudentEditValues
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .update({
      name: normalizeUpperText(values.name),
      mother_name: normalizeUpperText(values.motherName) || null,
      date_of_birth: values.dateOfBirth,
      gender: values.gender,
      mobile: normalizeTrimmedText(values.mobile),
      address: normalizeUpperText(values.address) || null,
      admission_date: values.admissionDate,
      status: values.status,
      comments: normalizeUpperText(values.comments) || null,
      updated_at: new Date().toISOString(),
    })
    .eq("institute_id", instituteId)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

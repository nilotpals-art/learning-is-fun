import "server-only";

import type {
  AssignmentFormOptions,
  StudentAssignment,
} from "@/features/student-academic-assignments/types/student-academic-assignment";
import type { StudentAssignmentValues } from "@/features/student-academic-assignments/validations/student-academic-assignment-schema";
import type { CreateSchoolValues } from "@/features/student-academic-assignments/validations/school-schema";
import { createClient } from "@/lib/supabase/server";
import { normalizeUpperText } from "@/lib/validation/normalization";

interface RelatedName { name: string }
interface RelatedClass { class_name: string }
interface RelatedStudent { name: string; admission_no: string }
interface AssignmentRecord {
  id: string; student_id: string; academic_year_id: string; school_id: string;
  board_id: string; class_id: string; batch_id: string; effective_from: string;
  effective_to: string | null; status: "Current" | "Completed";
  promotion_type: StudentAssignment["promotionType"]; remarks: string | null;
  created_at: string; student: RelatedStudent | RelatedStudent[];
  academic_year: RelatedName | RelatedName[]; school: RelatedName | RelatedName[];
  board: RelatedName | RelatedName[]; academic_class: RelatedClass | RelatedClass[];
  batch: RelatedName | RelatedName[];
}

function one<T>(value: T | T[]): T { return Array.isArray(value) ? value[0] : value; }

const SELECT = "id, student_id, academic_year_id, school_id, board_id, class_id, batch_id, effective_from, effective_to, status, promotion_type, remarks, created_at, student:students!student_assignments_student_fkey(name, admission_no), academic_year:academic_years!student_assignments_academic_year_fkey(name), school:schools!student_assignments_school_fkey(name), board:boards!student_assignments_board_fkey(name), academic_class:academic_classes!student_assignments_class_fkey(class_name), batch:batches!student_assignments_batch_compatibility_fkey(name)";

function toAssignment(row: AssignmentRecord): StudentAssignment {
  return { id: row.id, studentId: row.student_id, studentName: one(row.student).name,
    admissionNumber: one(row.student).admission_no, academicYearId: row.academic_year_id,
    academicYearName: one(row.academic_year).name, schoolId: row.school_id,
    schoolName: one(row.school).name, boardId: row.board_id, boardName: one(row.board).name,
    classId: row.class_id, className: one(row.academic_class).class_name,
    batchId: row.batch_id, batchName: one(row.batch).name, effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to, status: row.status, promotionType: row.promotion_type,
    remarks: row.remarks, createdAt: row.created_at };
}

export async function listStudentAssignments(instituteId: string): Promise<StudentAssignment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("student_assignments").select(SELECT)
    .eq("institute_id", instituteId).order("effective_from", { ascending: false });
  if (error) throw error;
  return (data as unknown as AssignmentRecord[]).map(toAssignment);
}

export async function listAssignmentOptions(instituteId: string): Promise<AssignmentFormOptions> {
  const supabase = await createClient();
  const [students, years, schools, boards, classes, batches] = await Promise.all([
    supabase.from("students").select("id, name, admission_no").eq("institute_id", instituteId).order("name"),
    supabase.from("academic_years").select("id, name").eq("institute_id", instituteId).eq("is_active", true).order("start_date", { ascending: false }),
    supabase.from("schools").select("id, name").eq("institute_id", instituteId).eq("is_active", true).order("name"),
    supabase.from("boards").select("id, name").eq("institute_id", instituteId).order("name"),
    supabase.from("academic_classes").select("id, class_name").eq("institute_id", instituteId).order("display_order", { nullsFirst: false }),
    supabase.from("batches").select("id, name, board_id, class_id").eq("institute_id", instituteId).eq("is_active", true).not("board_id", "is", null).not("class_id", "is", null).order("name"),
  ]);
  const error = students.error ?? years.error ?? schools.error ?? boards.error ?? classes.error ?? batches.error;
  if (error) throw error;
  return {
    students: (students.data ?? []).map((x) => ({ id: x.id, label: `${x.name} (${x.admission_no})` })),
    academicYears: (years.data ?? []).map((x) => ({ id: x.id, label: x.name })),
    schools: (schools.data ?? []).map((x) => ({ id: x.id, label: x.name })),
    boards: (boards.data ?? []).map((x) => ({ id: x.id, label: x.name })),
    classes: (classes.data ?? []).map((x) => ({ id: x.id, label: x.class_name })),
    batches: (batches.data ?? []).map((x) => ({ id: x.id, label: x.name, boardId: x.board_id as string, classId: x.class_id as string })),
  };
}

export async function changeStudentAssignment(values: StudentAssignmentValues): Promise<{ assignmentId: string; operation: "created" | "changed" }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("change_student_assignment", {
    p_student_id: values.studentId, p_academic_year_id: values.academicYearId,
    p_school_id: values.schoolId, p_board_id: values.boardId, p_class_id: values.classId,
    p_batch_id: values.batchId, p_effective_from: values.effectiveFrom,
    p_promotion_type: values.promotionType, p_remarks: normalizeUpperText(values.remarks),
  });
  if (error) throw error;
  const result = data as { assignment_id: string; operation: "created" | "changed" };
  return { assignmentId: result.assignment_id, operation: result.operation };
}

export async function createOrReuseSchool(instituteId: string, values: CreateSchoolValues): Promise<{ id: string; name: string; reused: boolean }> {
  const supabase = await createClient();
  const name = normalizeUpperText(values.name);
  const normalizedName = name;
  const findExisting = async () => {
    const result = await supabase.from("schools").select("id, name").eq("institute_id", instituteId);
    if (result.error) throw result.error;
    return result.data.find((school) => normalizeUpperText(school.name) === normalizedName);
  };
  const existing = await findExisting();
  if (existing) return { ...existing, reused: true };

  const created = await supabase.from("schools").insert({ institute_id: instituteId, name, is_active: true })
    .select("id, name").single();
  if (!created.error) return { ...created.data, reused: false };
  if (created.error.code !== "23505") throw created.error;

  const winner = await findExisting();
  if (!winner) throw created.error;
  return { ...winner, reused: true };
}

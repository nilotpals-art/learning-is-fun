import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  Batch,
  BatchFormOptions,
} from "@/features/batches/types/batch";
import type { BatchFormValues } from "@/features/batches/validations/batch-schema";

interface RelatedName {
  name: string;
}

interface RelatedClassName {
  class_name: string;
}

interface RelatedSubjectName {
  subject_name: string;
}

interface BatchRecord {
  id: string;
  name: string;
  teacher_id: string | null;
  teacher: RelatedName | RelatedName[] | null;
  board_id: string | null;
  board: RelatedName | RelatedName[] | null;
  class_id: string | null;
  academic_class: RelatedClassName | RelatedClassName[] | null;
  subject_id: string | null;
  subject: RelatedSubjectName | RelatedSubjectName[] | null;
  start_time: string | null;
  end_time: string | null;
  days: string | null;
  capacity: number | null;
  room: string | null;
  is_active: boolean | null;
  created_at: string | null;
}

const BATCH_SELECT =
  "id, name, teacher_id, teacher:teachers(name), board_id, board:boards(name), class_id, academic_class:academic_classes(class_name), subject_id, subject:subjects(subject_name), start_time, end_time, days, capacity, room, is_active, created_at";

function firstRelated<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function toBatch(record: BatchRecord): Batch {
  return {
    id: record.id,
    name: record.name,
    teacherId: record.teacher_id,
    teacherName: firstRelated(record.teacher)?.name ?? null,
    boardId: record.board_id,
    boardName: firstRelated(record.board)?.name ?? null,
    classId: record.class_id,
    className: firstRelated(record.academic_class)?.class_name ?? null,
    subjectId: record.subject_id,
    subjectName: firstRelated(record.subject)?.subject_name ?? null,
    startTime: record.start_time,
    endTime: record.end_time,
    days: record.days,
    capacity: record.capacity,
    room: record.room,
    isActive: record.is_active === true,
    createdAt: record.created_at,
  };
}

function nullable(value: string): string | null {
  return value === "" ? null : value;
}

function toPayload(values: BatchFormValues) {
  return {
    teacher_id: nullable(values.teacherId),
    board_id: nullable(values.boardId),
    class_id: nullable(values.classId),
    subject_id: nullable(values.subjectId),
    name: values.name,
    start_time: nullable(values.startTime),
    end_time: nullable(values.endTime),
    days: nullable(values.days),
    capacity: values.capacity === "" ? null : Number(values.capacity),
    room: nullable(values.room),
    is_active: values.isActive,
  };
}

export async function listBatches(instituteId: string): Promise<Batch[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("batches")
    .select(BATCH_SELECT)
    .eq("institute_id", instituteId)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data as unknown as BatchRecord[]).map(toBatch);
}

export async function getBatch(
  instituteId: string,
  id: string
): Promise<Batch | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("batches")
    .select(BATCH_SELECT)
    .eq("institute_id", instituteId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? toBatch(data as unknown as BatchRecord) : null;
}

export async function listBatchFormOptions(
  instituteId: string
): Promise<BatchFormOptions> {
  const supabase = await createClient();
  const [teachers, boards, classes, subjects] = await Promise.all([
    supabase.from("teachers").select("id, name").eq("institute_id", instituteId).order("name"),
    supabase.from("boards").select("id, name").eq("institute_id", instituteId).order("name"),
    supabase.from("academic_classes").select("id, class_name").eq("institute_id", instituteId).order("class_name"),
    supabase.from("subjects").select("id, subject_name").eq("institute_id", instituteId).order("subject_name"),
  ]);

  const error = teachers.error ?? boards.error ?? classes.error ?? subjects.error;
  if (error) throw error;

  return {
    teachers: (teachers.data ?? []).map((item) => ({ id: item.id as string, label: item.name as string })),
    boards: (boards.data ?? []).map((item) => ({ id: item.id as string, label: item.name as string })),
    classes: (classes.data ?? []).map((item) => ({ id: item.id as string, label: item.class_name as string })),
    subjects: (subjects.data ?? []).map((item) => ({ id: item.id as string, label: item.subject_name as string })),
  };
}

export async function batchNameExists(
  instituteId: string,
  name: string,
  excludedId?: string
): Promise<boolean> {
  const supabase = await createClient();
  let query = supabase.from("batches").select("id, name").eq("institute_id", instituteId);
  if (excludedId) query = query.neq("id", excludedId);
  const { data, error } = await query;
  if (error) throw error;
  const normalized = name.trim().toLocaleLowerCase();
  return (data ?? []).some(
    (item) => (item.name as string).trim().toLocaleLowerCase() === normalized
  );
}

export async function batchRelationsBelongToInstitute(
  instituteId: string,
  values: BatchFormValues
): Promise<boolean> {
  const relations = [
    ["teachers", values.teacherId],
    ["boards", values.boardId],
    ["academic_classes", values.classId],
    ["subjects", values.subjectId],
  ] as const;
  const supabase = await createClient();
  const checks = await Promise.all(
    relations.map(async ([table, id]) => {
      if (!id) return true;
      const { data, error } = await supabase
        .from(table)
        .select("id")
        .eq("id", id)
        .eq("institute_id", instituteId)
        .maybeSingle();
      if (error) throw error;
      return Boolean(data);
    })
  );
  return checks.every(Boolean);
}

export async function insertBatch(
  instituteId: string,
  values: BatchFormValues
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("batches").insert({
    institute_id: instituteId,
    ...toPayload(values),
  });
  if (error) throw error;
}

export async function updateBatchRecord(
  instituteId: string,
  id: string,
  values: BatchFormValues
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("batches")
    .update(toPayload(values))
    .eq("institute_id", instituteId)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function batchHasStudentReferences(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_batches")
    .select("id")
    .eq("batch_id", id)
    .limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function deleteBatchRecord(
  instituteId: string,
  id: string
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("batches")
    .delete()
    .eq("institute_id", instituteId)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

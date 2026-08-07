import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { SchoolBoard } from "@/features/school-boards/types/school-board";

interface SchoolBoardRecord {
  id: string;
  name: string;
  created_at: string | null;
}

function toSchoolBoard(record: SchoolBoardRecord): SchoolBoard {
  return {
    id: record.id,
    name: record.name,
    createdAt: record.created_at,
  };
}

function normalizeBoardName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

export async function listSchoolBoards(
  instituteId: string
): Promise<SchoolBoard[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boards")
    .select("id, name, created_at")
    .eq("institute_id", instituteId)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data as SchoolBoardRecord[]).map(toSchoolBoard);
}

export async function getSchoolBoard(
  instituteId: string,
  id: string
): Promise<SchoolBoard | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boards")
    .select("id, name, created_at")
    .eq("institute_id", instituteId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? toSchoolBoard(data as SchoolBoardRecord) : null;
}

export async function schoolBoardNameExists(
  instituteId: string,
  name: string,
  excludedId?: string
): Promise<boolean> {
  const supabase = await createClient();
  let query = supabase
    .from("boards")
    .select("id, name")
    .eq("institute_id", instituteId);

  if (excludedId) query = query.neq("id", excludedId);

  const { data, error } = await query;
  if (error) throw error;

  const normalizedName = normalizeBoardName(name);
  return (data ?? []).some(
    (board) => normalizeBoardName(board.name as string) === normalizedName
  );
}

export async function insertSchoolBoard(
  instituteId: string,
  name: string
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("boards").insert({
    institute_id: instituteId,
    name,
  });
  if (error) throw error;
}

export async function updateSchoolBoardRecord(
  instituteId: string,
  id: string,
  name: string
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boards")
    .update({ name })
    .eq("institute_id", instituteId)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

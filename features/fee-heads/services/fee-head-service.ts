import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  RECOMMENDED_FEE_HEADS,
  type FeeHead,
  type FeeHeadSetupState,
} from "@/features/fee-heads/types/fee-head";
import {
  getFeeHeadCategory,
  type FeeHeadFormValues,
} from "@/features/fee-heads/validations/fee-head-schema";

interface FeeHeadRecord {
  id: string;
  name: string;
  code: string;
  category: string;
  display_order: number;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface FeeHeadDuplicates {
  name: boolean;
  code: boolean;
}

function toFeeHead(record: FeeHeadRecord, assignedIds = new Set<string>()): FeeHead {
  return {
    id: record.id,
    name: record.name,
    code: record.code,
    category: record.category,
    displayOrder: record.display_order,
    isActive: record.is_active,
    assigned: assignedIds.has(record.id),
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

function toPayload(values: FeeHeadFormValues) {
  return {
    name: values.name,
    code: normalizeCode(values.code),
    category: getFeeHeadCategory(values),
    display_order: Number(values.displayOrder),
    is_active: values.isActive,
  };
}

export async function listFeeHeads(instituteId: string): Promise<FeeHead[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fee_heads")
    .select("id, name, code, category, display_order, is_active, created_at, updated_at")
    .eq("institute_id", instituteId)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;

  const records = data as FeeHeadRecord[];
  if (records.length === 0) return [];

  const { data: assignments, error: assignmentError } = await supabase
    .from("student_fee_assignments")
    .select("fee_head_id")
    .in("fee_head_id", records.map((record) => record.id));
  if (assignmentError) throw assignmentError;

  const assignedIds = new Set(
    (assignments ?? []).map((assignment) => assignment.fee_head_id as string)
  );
  return records.map((record) => toFeeHead(record, assignedIds));
}

export function getFeeHeadSetupState(
  feeHeads: Pick<FeeHead, "name" | "code">[]
): FeeHeadSetupState {
  const items = RECOMMENDED_FEE_HEADS.map((recommended) => {
    const nameMatch = feeHeads.find(
      (feeHead) => normalizeName(feeHead.name) === normalizeName(recommended.name)
    );
    const codeMatch = feeHeads.find(
      (feeHead) => normalizeCode(feeHead.code) === normalizeCode(recommended.code)
    );
    const conflictMessages: string[] = [];

    if (nameMatch && normalizeCode(nameMatch.code) !== recommended.code) {
      conflictMessages.push(
        `${recommended.name} already exists with code ${nameMatch.code}.`
      );
    }
    if (codeMatch && normalizeName(codeMatch.name) !== normalizeName(recommended.name)) {
      conflictMessages.push(
        `Code ${recommended.code} is already used by ${codeMatch.name}.`
      );
    }

    return {
      ...recommended,
      status: conflictMessages.length > 0
        ? ("conflict" as const)
        : nameMatch && codeMatch
          ? ("existing" as const)
          : ("missing" as const),
      conflictMessages,
    };
  });
  const conflicts = items.flatMap((item) => item.conflictMessages);
  const missingCount = items.filter((item) => item.status === "missing").length;
  return {
    complete: items.every((item) => item.status === "existing"),
    items,
    conflicts,
    missingCount,
  };
}

export async function getInstituteFeeHeadSetupState(
  instituteId: string
): Promise<FeeHeadSetupState> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fee_heads")
    .select("name, code")
    .eq("institute_id", instituteId);
  if (error) throw error;
  return getFeeHeadSetupState((data ?? []) as Pick<FeeHead, "name" | "code">[]);
}

export async function insertRecommendedFeeHeads(
  instituteId: string,
  state: FeeHeadSetupState
): Promise<number> {
  const missingCodes = new Set(
    state.items.filter((item) => item.status === "missing").map((item) => item.code)
  );
  const records = RECOMMENDED_FEE_HEADS.filter((item) => missingCodes.has(item.code));
  if (records.length === 0) return 0;

  const supabase = await createClient();
  const { error } = await supabase.from("fee_heads").insert(
    records.map((item) => ({
      institute_id: instituteId,
      name: item.name,
      code: item.code,
      category: item.category,
      display_order: item.displayOrder,
      is_active: item.isActive,
    }))
  );
  if (error) throw error;
  return records.length;
}

export async function getFeeHead(
  instituteId: string,
  id: string
): Promise<FeeHead | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fee_heads")
    .select("id, name, code, category, display_order, is_active, created_at, updated_at")
    .eq("institute_id", instituteId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? toFeeHead(data as FeeHeadRecord) : null;
}

export async function findFeeHeadDuplicates(
  instituteId: string,
  name: string,
  code: string,
  excludedId?: string
): Promise<FeeHeadDuplicates> {
  const supabase = await createClient();
  let query = supabase
    .from("fee_heads")
    .select("id, name, code")
    .eq("institute_id", instituteId);
  if (excludedId) query = query.neq("id", excludedId);
  const { data, error } = await query;
  if (error) throw error;

  const normalizedName = normalizeName(name);
  const normalizedCode = normalizeCode(code);
  return {
    name: (data ?? []).some(
      (item) => normalizeName(item.name as string) === normalizedName
    ),
    code: (data ?? []).some(
      (item) => normalizeCode(item.code as string) === normalizedCode
    ),
  };
}

export async function insertFeeHead(
  instituteId: string,
  values: FeeHeadFormValues
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("fee_heads").insert({
    institute_id: instituteId,
    ...toPayload(values),
  });
  if (error) throw error;
}

export async function updateFeeHeadRecord(
  instituteId: string,
  id: string,
  values: FeeHeadFormValues
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fee_heads")
    .update({
      ...toPayload(values),
      updated_at: new Date().toISOString(),
    })
    .eq("institute_id", instituteId)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  RECOMMENDED_PAYMENT_MODES,
  type PaymentMode,
  type PaymentModeSetupState,
} from "@/features/payment-modes/types/payment-mode";
import type { PaymentModeFormValues } from "@/features/payment-modes/validations/payment-mode-schema";

interface PaymentModeRecord {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function normalizeName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

function toPaymentMode(record: PaymentModeRecord): PaymentMode {
  return {
    id: record.id,
    name: record.name,
    isActive: record.is_active,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export function getPaymentModeSetupState(
  paymentModes: Pick<PaymentMode, "name">[]
): PaymentModeSetupState {
  const existingNames = new Set(paymentModes.map((mode) => normalizeName(mode.name)));
  const items = RECOMMENDED_PAYMENT_MODES.map((name) => ({
    name,
    exists: existingNames.has(normalizeName(name)),
  }));
  const missingCount = items.filter((item) => !item.exists).length;
  return { complete: missingCount === 0, missingCount, items };
}

export async function listPaymentModes(instituteId: string): Promise<PaymentMode[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_modes")
    .select("id, name, is_active, created_at, updated_at")
    .eq("institute_id", instituteId)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data as PaymentModeRecord[]).map(toPaymentMode);
}

export async function getPaymentMode(
  instituteId: string,
  id: string
): Promise<PaymentMode | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_modes")
    .select("id, name, is_active, created_at, updated_at")
    .eq("institute_id", instituteId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toPaymentMode(data as PaymentModeRecord) : null;
}

export async function paymentModeNameExists(
  instituteId: string,
  name: string,
  excludedId?: string
): Promise<boolean> {
  const supabase = await createClient();
  let query = supabase.from("payment_modes").select("id, name").eq("institute_id", instituteId);
  if (excludedId) query = query.neq("id", excludedId);
  const { data, error } = await query;
  if (error) throw error;
  const normalized = normalizeName(name);
  return (data ?? []).some((item) => normalizeName(item.name as string) === normalized);
}

export async function getInstitutePaymentModeSetupState(
  instituteId: string
): Promise<PaymentModeSetupState> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("payment_modes").select("name").eq("institute_id", instituteId);
  if (error) throw error;
  return getPaymentModeSetupState((data ?? []) as Pick<PaymentMode, "name">[]);
}

export async function insertRecommendedPaymentModes(
  instituteId: string,
  state: PaymentModeSetupState
): Promise<number> {
  const missing = state.items.filter((item) => !item.exists);
  if (missing.length === 0) return 0;
  const supabase = await createClient();
  const { error } = await supabase.from("payment_modes").insert(
    missing.map((item) => ({ institute_id: instituteId, name: item.name, is_active: true }))
  );
  if (error) throw error;
  return missing.length;
}

export async function insertPaymentMode(
  instituteId: string,
  values: PaymentModeFormValues
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("payment_modes").insert({
    institute_id: instituteId,
    name: values.name,
    is_active: values.isActive,
  });
  if (error) throw error;
}

export async function updatePaymentModeRecord(
  instituteId: string,
  id: string,
  values: PaymentModeFormValues
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_modes")
    .update({ name: values.name, is_active: values.isActive, updated_at: new Date().toISOString() })
    .eq("institute_id", instituteId)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

import { supabase } from "@/lib/supabase";
import type {
  DbKey,
  DbKeyInsert,
  DbKeyUpdate,
} from "@/types/database";

// ── Return types specific to this service ─────────────────────────────────────

export type DashboardStatusCount = {
  dashboard_status: string;
  count: number;
};

/** A key that is currently checked out, with holder and property info. */
export type CheckedOutKey = {
  id: string;
  property_id: string;
  label: string;
  status: string;
  due_back_at: string | null;
  current_holder_id: string | null;
  current_holder: {
    full_name: string | null;
    profile_id: string | null;
    holder_type: "agent" | "tenant" | "landlord";
  } | null;
  property: {
    address: string;
    formatted_address: string | null;
    suburb: string;
    city: string;
    postcode: string | null;
  } | null;
};

/** A key that is currently checked out, with holder and property info. */

export async function fetchKeysForProperty(
  propertyId: string,
): Promise<DbKey[]> {
  const { data, error } = await supabase
    .from("keys")
    .select("*")
    .eq("property_id", propertyId)
    .order("label", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** @todo Rebuild for the new key_sets model. */
export async function fetchCheckedOutKeys(_params: {
  userId: string;
  limit?: number;
}): Promise<never[]> {
  return [];
}

/** @todo Rebuild for the new key_sets model. */
export async function fetchKeysNeedingAttention(
  _currentUserId: string,
): Promise<never[]> {
  return [];
}

/** @todo Replace once dashboard view is ready. */
export async function fetchKeyDashboardCounts(): Promise<
  DashboardStatusCount[]
> {
  return [];
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function createKeys(inputs: DbKeyInsert[]): Promise<DbKey[]> {
  if (inputs.length === 0) return [];
  const { data, error } = await supabase.from("keys").insert(inputs).select();
  if (error) throw error;
  return data;
}

export async function createKey(input: DbKeyInsert): Promise<DbKey> {
  const { data, error } = await supabase
    .from("keys")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateKey(
  keyId: string,
  patch: DbKeyUpdate,
): Promise<DbKey> {
  const { data, error } = await supabase
    .from("keys")
    .update(patch)
    .eq("id", keyId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteKey(keyId: string): Promise<void> {
  const { error } = await supabase.from("keys").delete().eq("id", keyId);
  if (error) throw error;
}

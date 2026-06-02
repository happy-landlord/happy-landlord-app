import { supabase } from "@/lib/supabase/client";
import type { DbKey, DbKeyInsert, DbKeyUpdate } from "@/types/database";

// ── Return types specific to this service ─────────────────────────────────────

export type DashboardStatusCount = {
  dashboard_status: string;
  count: number;
};

export type AdminDashboardSummary = {
  total_properties: number;
  total_keysets: number;
  available_keysets: number;
  checked_out_keysets: number;
  overdue_keysets: number;
  lost_keysets: number;
  properties_with_tenant: number;
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

/** Fetch the admin dashboard summary from the `admin_dashboard_summary` view. */
export async function fetchAdminDashboardSummary(): Promise<AdminDashboardSummary | null> {
  const { data, error } = await supabase
    .from("admin_dashboard_summary")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data as AdminDashboardSummary | null;
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function createKeys(inputs: DbKeyInsert[]): Promise<DbKey[]> {
  if (inputs.length === 0) return [];
  const { data, error } = await supabase.from("keys").insert(inputs).select();
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

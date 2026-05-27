import { supabase } from "@/lib/supabase";
import type { ActivityTransaction } from "@/types/database";

// ── Shared select for activity / history queries ─────────────────────────────

export const TRANSACTION_SELECT = `
  *,
  property:properties(address, unit_number, suburb, formatted_address),
  from_holder:from_holder_id(full_name, holder_type, profile_id),
  to_holder:to_holder_id(full_name, holder_type, profile_id),
  items:key_transaction_items(*, key:keys(key_code, key_type, label))
` as const;

// ── Param types ───────────────────────────────────────────────────────────────

export type CheckoutParams = {
  /** IDs of keys to check out. */
  keyIds: string[];
  /** ISO timestamp — defaults to 7 days from now when omitted. */
  dueBackAt?: string | null;
  notes?: string | null;
};

export type ReturnParams = {
  keyIds: string[];
  notes?: string | null;
};

export type TransferParams = {
  keyIds: string[];
  notes?: string | null;
};

// ── RPCs ─────────────────────────────────────────────────────────────────────

/**
 * Checks out the given keys to the calling agent.
 * Calls `public.checkout_keys(p_key_ids, p_due_back_at, p_notes)`.
 * Returns the created `key_transactions.id`.
 */
export async function checkoutKeys({
  keyIds,
  dueBackAt,
  notes,
}: CheckoutParams): Promise<string> {
  const resolvedDueBack =
    dueBackAt !== undefined
      ? dueBackAt
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase.rpc("checkout_keys", {
    p_key_ids: keyIds,
    p_due_back_at: resolvedDueBack,
    p_notes: notes ?? null,
  });

  if (error) throw error;
  return data as string;
}

/**
 * Returns the given keys to the office.
 * Calls `public.return_keys(p_key_ids, p_notes)`.
 * Returns the created `key_transactions.id`.
 */
export async function returnKeys({
  keyIds,
  notes,
}: ReturnParams): Promise<string> {
  const { data, error } = await supabase.rpc("return_keys", {
    p_key_ids: keyIds,
    p_notes: notes ?? null,
  });

  if (error) throw error;
  return data as string;
}

/**
 * Transfers the given keys from their current holder to the calling agent.
 * Calls `public.transfer_keys_to_me(p_key_ids, p_notes)`.
 * Returns the created `key_transactions.id`.
 */
export async function transferKeysToMe({
  keyIds,
  notes,
}: TransferParams): Promise<string> {
  const { data, error } = await supabase.rpc("transfer_keys_to_me", {
    p_key_ids: keyIds,
    p_notes: notes ?? null,
  });

  if (error) throw error;
  return data as string;
}

// ── Activity / history queries ────────────────────────────────────────────────

const ACTIVITY_PAGE_SIZE = 25;

export type FetchActivityOptions = {
  userId?: string;
  isAdmin?: boolean;
  page?: number;
  search?: string;
  propertyId?: string;
};

/**
 * Unified paginated activity fetcher.
 * Admin sees all transactions; agents see only their own.
 * Supports server-side search by property address/suburb.
 */
export async function fetchActivity({
  userId,
  isAdmin = false,
  page = 0,
  search = "",
  propertyId,
}: FetchActivityOptions): Promise<ActivityTransaction[]> {
  let query = supabase
    .from("key_transactions")
    .select(TRANSACTION_SELECT)
    .order("created_at", { ascending: false })
    .range(page * ACTIVITY_PAGE_SIZE, (page + 1) * ACTIVITY_PAGE_SIZE - 1);

  if (!isAdmin && userId) {
    query = query.eq("updated_by", userId);
  }

  if (propertyId) {
    query = query.eq("property_id", propertyId);
  }

  if (search && search.trim().length > 0) {
    const term = `%${search.trim()}%`;
    // Filter via the joined property columns
    query = (query as any).or(
      `properties.address.ilike.${term},properties.suburb.ilike.${term},properties.formatted_address.ilike.${term}`,
      { foreignTable: "properties" }
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as ActivityTransaction[];
}

/**
 * Fetch transactions recorded by a specific user (agent view).
 * Ordered newest-first, capped at 200 rows.
 */
export async function fetchMyActivity(userId: string): Promise<ActivityTransaction[]> {
  const { data, error } = await supabase
    .from("key_transactions")
    .select(TRANSACTION_SELECT)
    .eq("updated_by", userId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  return data as ActivityTransaction[];
}

/**
 * Fetch all transactions across all users (admin view).
 * Ordered newest-first, capped at 500 rows.
 */
export async function fetchAllActivity(): Promise<ActivityTransaction[]> {
  const { data, error } = await supabase
    .from("key_transactions")
    .select(TRANSACTION_SELECT)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw error;
  return data as ActivityTransaction[];
}

/**
 * Fetch all transactions for a specific property (property detail view).
 */
export async function fetchTransactionsForProperty(
  propertyId: string,
): Promise<ActivityTransaction[]> {
  const { data, error } = await supabase
    .from("key_transactions")
    .select(TRANSACTION_SELECT)
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  return data as ActivityTransaction[];
}


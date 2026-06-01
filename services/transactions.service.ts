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


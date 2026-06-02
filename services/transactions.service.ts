import { supabase } from "@/lib/supabase";
import type { ActivityTransaction } from "@/types/database";

// ── Shared select for activity / history queries ─────────────────────────────

export const TRANSACTION_SELECT = `
  *,
  property:property_id(address, unit_number, suburb, formatted_address),
  from_holder:from_holder_id(full_name, holder_type, profile_id),
  to_holder:to_holder_id(full_name, holder_type, profile_id),
  key_set:key_set_id(code, name)
` as const;


// ── Activity / history queries ────────────────────────────────────────────────

const ACTIVITY_PAGE_SIZE = 25;

export type FetchActivityOptions = {
  userId?: string;
  isAdmin?: boolean;
  page?: number;
  search?: string;
  propertyId?: string;
  keySetId?: string;
};

/**
 * Resolve property IDs matching a free-text search term.
 * Returns null when no search term is provided (meaning "no filter").
 */
async function resolvePropertyIds(search: string): Promise<string[] | null> {
  const term = search.trim();
  if (!term) return null;

  const { data, error } = await supabase
    .from("properties")
    .select("id")
    .or(
      `address.ilike.%${term}%,suburb.ilike.%${term}%,formatted_address.ilike.%${term}%`,
    );

  if (error) throw error;
  return (data ?? []).map((p) => p.id);
}

/**
 * Unified paginated activity fetcher.
 * Returns all visible transactions for the Activity tab.
 * Supports server-side search by property address/suburb.
 */
export async function fetchActivity({
  page = 0,
  search = "",
  propertyId,
  keySetId,
}: FetchActivityOptions): Promise<ActivityTransaction[]> {
  // keySetId filter takes priority — no need for a property search
  if (keySetId) {
    let query = supabase
      .from("transactions")
      .select(TRANSACTION_SELECT)
      .eq("key_set_id", keySetId)
      .order("created_at", { ascending: false })
      .range(page * ACTIVITY_PAGE_SIZE, (page + 1) * ACTIVITY_PAGE_SIZE - 1);

    const { data, error } = await query;
    if (error) throw error;
    return data as unknown as ActivityTransaction[];
  }

  // Resolve property filter from search term first (separate query)
  const searchPropertyIds = await resolvePropertyIds(search);

  // If search was provided but matched no properties, return empty immediately
  if (searchPropertyIds !== null && searchPropertyIds.length === 0) {
    return [];
  }

  let query = supabase
    .from("transactions")
    .select(TRANSACTION_SELECT)
    .order("created_at", { ascending: false })
    .range(page * ACTIVITY_PAGE_SIZE, (page + 1) * ACTIVITY_PAGE_SIZE - 1);


  if (propertyId) {
    query = query.eq("property_id", propertyId);
  } else if (searchPropertyIds !== null) {
    query = query.in("property_id", searchPropertyIds);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as ActivityTransaction[];
}

/**
 * Fetch transactions involving a specific user (agent view).
 *
 * `updated_by` is not enough for returns: an admin can record a return on
 * behalf of an agent, while the agent remains the `from_holder` who returned
 * the key. Fetch recent activity and filter after joining holders so "You
 * returned" appears in My Activity.
 * Ordered newest-first, capped at 200 rows.
 */
export async function fetchMyActivity(userId: string): Promise<ActivityTransaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select(TRANSACTION_SELECT)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw error;

  return (data as unknown as ActivityTransaction[])
    .filter(
      (item) =>
        item.updated_by === userId ||
        item.from_holder?.profile_id === userId ||
        item.to_holder?.profile_id === userId,
    )
    .slice(0, 200);
}

/**
 * Fetch all transactions across all users (admin view).
 * Ordered newest-first, capped at 500 rows.
 */
export async function fetchAllActivity(): Promise<ActivityTransaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select(TRANSACTION_SELECT)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw error;
  return data as unknown as ActivityTransaction[];
}

/**
 * Fetch all transactions for a specific property (property detail view).
 */
export async function fetchTransactionsForProperty(
  propertyId: string,
): Promise<ActivityTransaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select(TRANSACTION_SELECT)
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  return data as unknown as ActivityTransaction[];
}


import { supabase } from "@/lib/supabase";
import type { ActivityTransaction } from "@/types";

// ── Shared select for activity / history queries ─────────────────────────────

export const TRANSACTION_SELECT = `
  *,
  property:property_id(address, unit_number, suburb, formatted_address, status),
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
  /** When true (admin only), restrict to transactions where userId is involved */
  myActivityOnly?: boolean;
  /** ISO date string "YYYY-MM-DD" — only return transactions on or after this date */
  dateFrom?: string;
  /** ISO date string "YYYY-MM-DD" — only return transactions on or before this date */
  dateTo?: string;
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
    .eq("status", "active")
    .or(
      `address.ilike.%${term}%,suburb.ilike.%${term}%,formatted_address.ilike.%${term}%`,
    );

  if (error) throw error;
  return (data ?? []).map((p) => p.id);
}

/**
 * Resolve keyset IDs whose code contains the search term.
 * Returns null when no search term is provided.
 */
async function resolveKeySetIds(search: string): Promise<string[] | null> {
  const term = search.trim();
  if (!term) return null;

  const { data, error } = await supabase
    .from("key_sets")
    .select("id")
    .ilike("code", `%${term}%`);

  if (error) throw error;
  return (data ?? []).map((k) => k.id);
}

/**
 * Unified paginated activity fetcher.
 * Returns all visible transactions for the Activity tab.
 * Supports server-side search by property address/suburb/keyset code,
 * "my activity only" scoping, and date-range filtering.
 */
export async function fetchActivity({
  userId,
  page = 0,
  search = "",
  propertyId,
  keySetId,
  myActivityOnly = false,
  dateFrom,
  dateTo,
}: FetchActivityOptions): Promise<ActivityTransaction[]> {
  // keySetId filter takes priority — no need for a text search
  if (keySetId) {
    let query = supabase
      .from("transactions")
      .select(TRANSACTION_SELECT)
      .eq("key_set_id", keySetId)
      .eq("property.status", "active")
      .order("created_at", { ascending: false })
      .range(page * ACTIVITY_PAGE_SIZE, (page + 1) * ACTIVITY_PAGE_SIZE - 1);

    const { data, error } = await query;
    if (error) throw error;
    return data as unknown as ActivityTransaction[];
  }

  // Resolve property AND keyset IDs from search term in parallel
  const [searchPropertyIds, searchKeySetIds] = await Promise.all([
    resolvePropertyIds(search),
    resolveKeySetIds(search),
  ]);

  // If search was provided but matched neither properties nor keysets → empty
  const searchHasResults =
    searchPropertyIds === null ||
    (searchPropertyIds.length > 0 ||
      (searchKeySetIds !== null && searchKeySetIds.length > 0));

  if (!searchHasResults) {
    return [];
  }

  let query = supabase
    .from("transactions")
    .select(TRANSACTION_SELECT)
    .eq("property.status", "active")
    .order("created_at", { ascending: false })
    .range(page * ACTIVITY_PAGE_SIZE, (page + 1) * ACTIVITY_PAGE_SIZE - 1);

  // ── Property/keyset search filter ─────────────────────────────────────────
  if (propertyId) {
    query = query.eq("property_id", propertyId);
  } else if (searchPropertyIds !== null) {
    // Build OR clause: match property address OR keyset code
    const conditions: string[] = [];
    if (searchPropertyIds.length > 0) {
      conditions.push(`property_id.in.(${searchPropertyIds.join(",")})`);
    }
    if (searchKeySetIds && searchKeySetIds.length > 0) {
      conditions.push(`key_set_id.in.(${searchKeySetIds.join(",")})`);
    }
    if (conditions.length > 0) {
      query = query.or(conditions.join(","));
    }
  }

  // ── "My activity only" filter ─────────────────────────────────────────────
  if (myActivityOnly && userId) {
    query = query.or(
      `from_holder_id.eq.${userId},to_holder_id.eq.${userId},updated_by.eq.${userId}`,
    );
  }

  // ── Date range filter ─────────────────────────────────────────────────────
  if (dateFrom) {
    query = query.gte("created_at", `${dateFrom}T00:00:00.000Z`);
  }
  if (dateTo) {
    query = query.lte("created_at", `${dateTo}T23:59:59.999Z`);
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
    .eq("property.status", "active")
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
    .eq("property.status", "active")
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


import { supabase } from "@/lib/supabase";
import type { DbKey, DbKeyInsert, DbKeyUpdate } from "@/types/database";

export type Key = DbKey;
export type KeyType = Key["key_type"];
export type KeyStatus = Key["status"];
export type { DbKeyInsert, DbKeyUpdate };

/** Resolved holder data joined from the key_holders table. */
export type ResolvedKeyHolder = {
  profile_id: string | null;
  full_name: string | null;
  holder_type: "agent" | "tenant" | "landlord";
};

/**
 * Key enriched with the resolved current holder's profile info.
 * `due_back_at` is populated from the latest "borrowed" transaction.
 */
export type KeyWithHolder = Key & {
  current_holder: ResolvedKeyHolder | null;
  due_back_at?: string | null;
};

export type CheckedOutKey = KeyWithHolder & {
  property: {
    id: string;
    address: string;
    suburb: string;
    city: string;
    postcode: string | null;
    formatted_address: string | null;
  } | null;
  due_back_at: string | null;
};

const KEY_SELECT =
  "*, current_holder:current_holder_id(profile_id, full_name, holder_type)" as const;

// ─────────────────────────────────────────────────────────────────────────────
// Fetch helpers
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchKeyByCode(
  keyCode: string,
): Promise<KeyWithHolder | null> {
  const { data, error } = await supabase
    .from("keys")
    .select(KEY_SELECT)
    .eq("key_code", keyCode.trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data as KeyWithHolder | null;
}

export async function fetchKeyById(
  keyId: string,
): Promise<KeyWithHolder | null> {
  const { data, error } = await supabase
    .from("keys")
    .select(KEY_SELECT)
    .eq("id", keyId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const key = data as KeyWithHolder;

  // Populate due_back_at from the most recent "borrowed" transaction for this key.
  if (key.status === "borrowed" || key.status === "overdue") {
    const { data: tx } = await supabase
      .from("key_transactions")
      .select("due_back_at, key_transaction_items!inner(key_id)")
      .eq("transaction_type", "borrowed")
      .eq("key_transaction_items.key_id", keyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    key.due_back_at =
      (tx as { due_back_at: string | null } | null)?.due_back_at ?? null;
  }

  return key;
}

export async function fetchCheckedOutKeys({
  userId,
  isAdmin,
  limit = 5,
}: {
  userId: string;
  isAdmin: boolean;
  limit?: number;
}): Promise<CheckedOutKey[]> {
  const { data, error } = await supabase
    .from("keys")
    .select(
      `*,
      current_holder:current_holder_id(profile_id, full_name, holder_type),
      property:property_id(id, address, suburb, city, postcode, formatted_address)
      `,
    )
    .in("status", ["borrowed", "overdue"])
    .order("updated_at", { ascending: false })
    .limit(isAdmin ? Math.max(limit * 5, 100) : 50);

  if (error) throw error;

  const rows = (data ?? []) as CheckedOutKey[];
  const visibleRows = isAdmin
    ? rows
    : rows.filter((key) => key.current_holder?.profile_id === userId);

  const limitedRows = visibleRows.slice(0, limit);
  const keyIds = limitedRows.map((k) => k.id);

  if (keyIds.length === 0) return limitedRows;

  // Fetch due_back_at from the most recent "borrowed" transaction for each key.
  const { data: txData } = await supabase
    .from("key_transactions")
    .select("due_back_at, created_at, key_transaction_items!inner(key_id)")
    .eq("transaction_type", "borrowed")
    .in("key_transaction_items.key_id", keyIds)
    .order("created_at", { ascending: false });

  type TxRow = {
    due_back_at: string | null;
    created_at: string;
    key_transaction_items: { key_id: string }[];
  };

  const dueByKey = new Map<string, string | null>();
  for (const tx of (txData ?? []) as unknown as TxRow[]) {
    for (const item of tx.key_transaction_items) {
      if (!dueByKey.has(item.key_id)) {
        dueByKey.set(item.key_id, tx.due_back_at);
      }
    }
  }

  return limitedRows.map((key) => ({
    ...key,
    due_back_at: dueByKey.get(key.id) ?? null,
  }));
}

export async function fetchKeysForProperty(
  propertyId: string,
): Promise<KeyWithHolder[]> {
  const { data, error } = await supabase
    .from("keys")
    .select(KEY_SELECT)
    .eq("property_id", propertyId)
    .order("key_code", { ascending: true });

  if (error) throw error;

  const keys = (data ?? []) as KeyWithHolder[];

  // Populate due_back_at for borrowed/overdue keys from the most recent transaction.
  const borrowedIds = keys
    .filter((k) => k.status === "borrowed" || k.status === "overdue")
    .map((k) => k.id);

  if (borrowedIds.length === 0) return keys;

  const { data: txData } = await supabase
    .from("key_transactions")
    .select("due_back_at, created_at, key_transaction_items!inner(key_id)")
    .eq("transaction_type", "borrowed")
    .in("key_transaction_items.key_id", borrowedIds)
    .order("created_at", { ascending: false });

  type TxRow = {
    due_back_at: string | null;
    created_at: string;
    key_transaction_items: { key_id: string }[];
  };

  const dueByKey = new Map<string, string | null>();
  for (const tx of (txData ?? []) as unknown as TxRow[]) {
    for (const item of tx.key_transaction_items) {
      if (!dueByKey.has(item.key_id)) {
        dueByKey.set(item.key_id, tx.due_back_at);
      }
    }
  }

  return keys.map((k) =>
    dueByKey.has(k.id) ? { ...k, due_back_at: dueByKey.get(k.id) ?? null } : k,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

/** Creates a single key row and returns the inserted record. */
export async function createKey(input: DbKeyInsert): Promise<Key> {
  const { data, error } = await supabase
    .from("keys")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Creates multiple key rows in a single request and returns them. */
export async function createKeys(inputs: DbKeyInsert[]): Promise<Key[]> {
  if (inputs.length === 0) return [];
  const { data, error } = await supabase.from("keys").insert(inputs).select();

  if (error) throw error;
  return data;
}

/** Updates a single key row. */
export async function updateKey(
  keyId: string,
  patch: DbKeyUpdate,
): Promise<Key> {
  const { data, error } = await supabase
    .from("keys")
    .update(patch)
    .eq("id", keyId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Checkout / return / transfer RPCs live in @/services/transactions.service

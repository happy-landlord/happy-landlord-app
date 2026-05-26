import { supabase } from "@/lib/supabase";
import type {
  DbKeySet,
  DbKeySetInsert,
  KeyInventory,
  KeyInventoryItem,
  KeyItemType,
} from "@/types/database";

export type KeySet = DbKeySet;
export type KeySetType = KeySet["set_type"];
export type KeySetStatus = KeySet["status"];
// Re-export inventory types so consumers don't need to reach into @/types/database directly
export type { KeyInventory, KeyInventoryItem, KeyItemType };

/** Resolved holder data joined from the key_holders table. */
export type ResolvedKeyHolder = {
  profile_id: string | null;
  full_name: string | null;
  holder_type: "agent" | "tenant";
};

/**
 * KeySet enriched with the resolved current holder's profile info.
 * Used on agent-facing screens so we can determine whether the current user
 * is the one holding the key (checked_out_by_me vs checked_out_by_other).
 *
 * `due_back_at` is populated from the latest "borrowed" movement when the
 * keyset is currently checked out — used to drive the countdown timer.
 */
export type KeySetWithHolder = KeySet & {
  current_holder: ResolvedKeyHolder | null;
  due_back_at?: string | null;
};

export type CheckedOutKeySet = KeySetWithHolder & {
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

type CheckoutDueMovement = {
  key_set_id: string;
  due_back_at: string | null;
  created_at: string;
};

export type FetchKeySetsOptions = {
  /** Filter to a specific set_type — agents pass "company" */
  setType?: KeySetType;
};

const KEY_SET_SELECT =
  "*, current_holder:current_holder_id(profile_id, full_name, holder_type)" as const;

// ─────────────────────────────────────────────────────────────────────────────
// Checkout / return params
// ─────────────────────────────────────────────────────────────────────────────

export type CheckoutParams = {
  keySetId: string;
  /** ISO string — defaults to 7 days from now when omitted. */
  dueBackAt?: string | null;
  notes?: string | null;
};

export type ReturnParams = {
  keySetId: string;
  notes?: string | null;
};

export type TransferParams = {
  keySetId: string;
  notes?: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Checkout
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks a keyset out to the calling agent via the `checkout_key_set` RPC.
 *
 * The RPC runs as SECURITY DEFINER so it bypasses RLS on key_sets,
 * key_holders and key_movements — all three writes are handled atomically
 * server-side.  Returns the agent's key_holders.id (holderId).
 */
export async function checkoutKeyset({
  keySetId,
  dueBackAt,
  notes,
}: CheckoutParams): Promise<string> {
  const resolvedDueBack =
    dueBackAt !== undefined
      ? dueBackAt
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase.rpc("checkout_key_set", {
    p_key_set_id: keySetId,
    p_due_back_at: resolvedDueBack,
    p_notes: notes ?? null,
  });

  if (error) throw error;
  return data as string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Return
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a keyset via the `checkin_key_set` RPC.
 *
 * The RPC runs as SECURITY DEFINER so it bypasses RLS on key_sets and
 * key_movements — both writes are handled atomically server-side.
 */
export async function returnKeyset({
  keySetId,
  notes,
}: ReturnParams): Promise<void> {
  const { data, error } = await supabase.rpc("return_key_set", {
    p_key_set_id: keySetId,
    p_notes: notes ?? null,
  });

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Transfer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Transfers a borrowed keyset from its current holder to the calling agent
 * via the `transfer_key_set_to_me` RPC.
 *
 * The keyset stays in 'borrowed' status — only current_holder_id changes.
 * Returns the caller's key_holders.id.
 */
export async function transferKeyset({
  keySetId,
  notes,
}: TransferParams): Promise<string> {
  const { data, error } = await supabase.rpc("transfer_key_set_to_me", {
    p_key_set_id: keySetId,
    p_notes: notes ?? null,
  });

  if (error) throw error;
  return data as string;
}

// ─────────────────────────────────────────────────────────────────────────────

export async function fetchKeySetByCode(
  setCode: string,
): Promise<KeySetWithHolder | null> {
  const { data, error } = await supabase
    .from("key_sets")
    .select(KEY_SET_SELECT)
    .eq("set_code", setCode.trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data as KeySetWithHolder | null;
}

export async function fetchKeySetById(
  keySetId: string,
): Promise<KeySetWithHolder | null> {
  const { data, error } = await supabase
    .from("key_sets")
    .select(KEY_SET_SELECT)
    .eq("id", keySetId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const keySet = data as KeySetWithHolder;

  // If the keyset is currently checked out, look up the most recent
  // "borrowed" movement to get the due_back_at for the countdown timer.
  if (keySet.status === "borrowed" || keySet.status === "overdue") {
    const { data: movement } = await supabase
      .from("key_movements")
      .select("due_back_at")
      .eq("key_set_id", keySetId)
      .eq("movement_type", "borrowed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    keySet.due_back_at = movement?.due_back_at ?? null;
  }

  return keySet;
}

export async function fetchCheckedOutKeySets({
  userId,
  isAdmin,
  limit = 5,
}: {
  userId: string;
  isAdmin: boolean;
  limit?: number;
}): Promise<CheckedOutKeySet[]> {
  const { data, error } = await supabase
    .from("key_sets")
    .select(
      `
      *,
      current_holder:current_holder_id(profile_id, full_name, holder_type),
      property:property_id(id, address, suburb, city, postcode, formatted_address)
    `,
    )
    .in("status", ["borrowed", "overdue"])
    .order("updated_at", { ascending: false })
    .limit(isAdmin ? limit : 50);

  if (error) throw error;

  const rows = (data ?? []) as CheckedOutKeySet[];
  const visibleRows = isAdmin
    ? rows
    : rows.filter((keySet) => keySet.current_holder?.profile_id === userId);

  const limitedRows = visibleRows.slice(0, limit);
  const keySetIds = limitedRows.map((keySet) => keySet.id);

  if (keySetIds.length === 0) return limitedRows;

  const { data: checkoutMovements, error: movementError } = await supabase
    .from("key_movements")
    .select("key_set_id, due_back_at, created_at")
    .in("key_set_id", keySetIds)
    .eq("movement_type", "borrowed")
    .order("created_at", { ascending: false });

  if (movementError) throw movementError;

  const dueByKeySet = new Map<string, string | null>();
  for (const movement of (checkoutMovements ?? []) as CheckoutDueMovement[]) {
    if (!dueByKeySet.has(movement.key_set_id)) {
      dueByKeySet.set(movement.key_set_id, movement.due_back_at);
    }
  }

  return limitedRows.map((keySet) => ({
    ...keySet,
    due_back_at: dueByKeySet.get(keySet.id) ?? null,
  }));
}

export async function fetchKeySetsForProperty(
  propertyId: string,
  { setType }: FetchKeySetsOptions = {},
): Promise<KeySetWithHolder[]> {
  let query = supabase
    .from("key_sets")
    .select(KEY_SET_SELECT)
    .eq("property_id", propertyId)
    .order("set_code", { ascending: true });

  if (setType) {
    query = query.eq("set_type", setType);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as KeySetWithHolder[];
}

/** Creates a single key_set row and returns the inserted record. */
export async function createKeySet(input: DbKeySetInsert): Promise<KeySet> {
  const { data, error } = await supabase
    .from("key_sets")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Creates multiple key_set rows in a single request and returns them. */
export async function createKeySets(inputs: DbKeySetInsert[]): Promise<KeySet[]> {
  if (inputs.length === 0) return [];
  const { data, error } = await supabase
    .from("key_sets")
    .insert(inputs)
    .select();

  if (error) throw error;
  return data;
}


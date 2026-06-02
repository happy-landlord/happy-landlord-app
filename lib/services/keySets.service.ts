import { supabase } from "@/lib/supabase/client";
import type {
  DbKeySet,
  DbKeySetInsert,
  DbKeySetUpdate,
  KeyType,
  StoredImage,
} from "@/types/database";

// ── Shared types ──────────────────────────────────────────────────────────────

export type KeyInSet = {
  id: string;
  key_type: KeyType;
  label: string;
  code: string | null;
  quantity: number;
  notes: string | null;
};

/** `UnassignedKey` is structurally identical to `KeyInSet` — use `KeyInSet` directly. */
export type UnassignedKey = KeyInSet;

export type KeySetHolder = {
  id: string;
  full_name: string | null;
  holder_type: "agent" | "tenant" | "landlord";
  profile_id: string | null;
  phone: string | null;
};

export type KeySetWithDetails = DbKeySet & {
  keys: KeyInSet[];
  current_holder: KeySetHolder | null;
};

/** A keyset that is currently checked out or overdue, with holder + property info. */
export type CheckedOutKeySet = {
  id: string;
  property_id: string;
  name: string;
  code: string;
  status: "checked_out" | "overdue";
  due_back_at: string | null;
  current_holder_id: string | null;
  current_holder: {
    full_name: string | null;
    profile_id: string | null;
    holder_type: "agent" | "tenant" | "landlord";
    phone: string | null;
  } | null;
  property: {
    address: string;
    formatted_address: string | null;
    suburb: string;
    city: string;
    postcode: string | null;
  } | null;
  keys: { label: string }[];
};

/** A keyset that needs admin attention (overdue or missing/damaged). */
export type KeySetNeedingAttention = {
  id: string;
  property_id: string;
  name: string;
  status: "overdue" | "missing_damaged";
  current_holder: {
    full_name: string | null;
    profile_id: string | null;
    holder_type: "agent" | "tenant" | "landlord";
  } | null;
  property: {
    address: string;
    suburb: string;
    city: string;
    postcode: string | null;
  } | null;
};

// ── Select fragment ───────────────────────────────────────────────────────────

const KEY_SET_SELECT = `
  *,
  current_holder:current_holder_id(id, full_name, holder_type, profile_id, phone),
  keys(id, key_type, label, code, quantity, notes)
` as const;

// ── Fetch helpers ─────────────────────────────────────────────────────────────

export async function fetchKeySetsForProperty(
  propertyId: string,
): Promise<KeySetWithDetails[]> {
  const { data, error } = await supabase
    .from("key_sets")
    .select(KEY_SET_SELECT)
    .eq("property_id", propertyId)
    .neq("status", "inactive")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as KeySetWithDetails[];
}

export async function fetchKeySetById(
  keySetId: string,
): Promise<KeySetWithDetails | null> {
  const { data, error } = await supabase
    .from("key_sets")
    .select(KEY_SET_SELECT)
    .eq("id", keySetId)
    .maybeSingle();

  if (error) throw error;
  return data as KeySetWithDetails | null;
}

export async function fetchKeySetByCode(
  code: string,
): Promise<KeySetWithDetails | null> {
  const { data, error } = await supabase
    .from("key_sets")
    .select(KEY_SET_SELECT)
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();

  if (error) throw error;
  return data as KeySetWithDetails | null;
}

export async function fetchUnassignedKeysForProperty(
  propertyId: string,
): Promise<UnassignedKey[]> {
  const { data, error } = await supabase
    .from("keys")
    .select("id, key_type, label, code, quantity, notes")
    .eq("property_id", propertyId)
    .is("key_set_id", null)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as UnassignedKey[];
}

/**
 * Fetch all keysets currently checked out or overdue, limited to `limit` rows.
 * Returns keysets with their current holder and property info.
 */
export async function fetchCheckedOutKeySets(
  limit = 10,
): Promise<CheckedOutKeySet[]> {
  const { data, error } = await supabase
    .from("key_sets")
    .select(
      `
      id, property_id, name, code, status, due_back_at, current_holder_id,
      current_holder:current_holder_id(full_name, holder_type, profile_id, phone),
      property:property_id(address, formatted_address, suburb, city, postcode),
      keys(label)
    `,
    )
    .in("status", ["checked_out", "overdue"])
    .order("due_back_at", { ascending: true, nullsFirst: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as CheckedOutKeySet[];
}

/**
 * Fetch all keysets needing admin attention: overdue or missing/damaged.
 * Ordered so missing/damaged appear first, then overdue.
 */
export async function fetchKeySetsNeedingAttention(): Promise<
  KeySetNeedingAttention[]
> {
  const { data, error } = await supabase
    .from("key_sets")
    .select(
      `
      id, property_id, name, status,
      current_holder:current_holder_id(full_name, holder_type, profile_id),
      property:property_id(address, suburb, city, postcode)
    `,
    )
    .in("status", ["overdue", "missing_damaged"])
    .order("status", { ascending: true }); // missing_damaged < overdue alphabetically

  if (error) throw error;
  return (data ?? []) as unknown as KeySetNeedingAttention[];
}

// ── Mutation param types ──────────────────────────────────────────────────────

export type CheckoutKeySetParams = {
  keySetId: string;
  dueBackAt?: string | null;
  notes?: string | null;
};

export type ReturnKeySetParams = {
  keySetId: string;
  notes?: string | null;
};

export type TransferKeySetParams = {
  keySetId: string;
  notes?: string | null;
};

export type ExtendKeySetParams = {
  keySetId: string;
  dueBackAt: string;
  notes?: string | null;
};

// ── RPCs ──────────────────────────────────────────────────────────────────────

/**
 * Checks out a key set to the calling agent.
 * Calls `public.checkout_key_set(p_key_set_id, p_due_back_at, p_notes)`.
 * Returns the created transaction id.
 */
export async function checkoutKeySet({
  keySetId,
  dueBackAt,
  notes,
}: CheckoutKeySetParams): Promise<string> {
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

/**
 * Returns a key set to the office.
 * Calls `public.return_key_set(p_key_set_id, p_notes)`.
 */
export async function returnKeySet({
  keySetId,
  notes,
}: ReturnKeySetParams): Promise<string> {
  const { data, error } = await supabase.rpc("return_key_set", {
    p_key_set_id: keySetId,
    p_notes: notes ?? null,
  });

  if (error) throw error;
  return data as string;
}

/**
 * Transfers a key set from its current holder to the calling agent.
 * Calls `public.transfer_key_set(p_key_set_id, p_notes)`.
 */
export async function transferKeySet({
  keySetId,
  notes,
}: TransferKeySetParams): Promise<string> {
  const { data, error } = await supabase.rpc("transfer_key_set_to_me", {
    p_key_set_id: keySetId,
    p_notes: notes ?? null,
  });

  if (error) throw error;
  return data as string;
}

/**
 * Extends the checkout due date for a key set (admin action).
 * Directly updates the due_back_at column.
 */
export async function extendKeySetCheckout({
  keySetId,
  dueBackAt,
}: ExtendKeySetParams): Promise<void> {
  const { error } = await supabase
    .from("key_sets")
    .update({ due_back_at: dueBackAt, updated_at: new Date().toISOString() })
    .eq("id", keySetId);

  if (error) throw error;
}

/**
 * Marks a key set as missing/damaged via RPC.
 */
export async function reportKeySetLost(
  keySetId: string,
  notes?: string | null,
): Promise<void> {
  const { error } = await supabase.rpc("report_key_set_missing", {
    p_key_set_id: keySetId,
    p_notes: notes ?? null,
  });

  if (error) throw error;
}

/**
 * Undoes a "report lost" action, restoring the key set to checked_out status.
 */
export async function undoReportKeySetLost(keySetId: string): Promise<void> {
  const { error } = await supabase.rpc("undo_report_key_set_missing", {
    p_key_set_id: keySetId,
  });

  if (error) throw error;
}

// ── Write helpers ─────────────────────────────────────────────────────────────

export async function createKeySet(input: DbKeySetInsert): Promise<DbKeySet> {
  const { data, error } = await supabase
    .from("key_sets")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateKeySet(
  keySetId: string,
  patch: DbKeySetUpdate,
): Promise<DbKeySet> {
  const { data, error } = await supabase
    .from("key_sets")
    .update(patch)
    .eq("id", keySetId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ── Image helpers ─────────────────────────────────────────────────────────────

const KEY_SET_SIGNED_URL_TTL = 3600;

function resolveKeySetImageStoragePath(path: string): {
  bucket: "properties" | "key_sets";
  path: string;
} {
  if (path.startsWith("properties/")) {
    return { bucket: "properties", path: path.replace(/^properties\//, "") };
  }
  if (path.startsWith("key_sets/")) {
    return { bucket: "key_sets", path: path.replace(/^key_sets\//, "") };
  }
  // Legacy fallback: older rows stored only "{keySetId}/photo-1.jpg" in the
  // key_sets bucket.
  return { bucket: "key_sets", path };
}

export function getVisibleKeySetImages(images: StoredImage[]): StoredImage[] {
  return [...images]
    .filter((img) => !img.is_hidden)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export async function fetchSignedKeySetImageUrl(
  path: string,
  expiresIn = KEY_SET_SIGNED_URL_TTL,
): Promise<string | null> {
  if (!path) return null;
  const resolved = resolveKeySetImageStoragePath(path);
  const { data, error } = await supabase.storage
    .from(resolved.bucket)
    .createSignedUrl(resolved.path, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/**
 * Uploads local photo URIs to Supabase Storage under
 * `properties/{propertyId}/{keySetId}/` in the `properties` bucket
 * and returns a `StoredImage[]` array ready to be saved in the DB.
 */
export async function uploadKeySetImages(
  propertyId: string,
  keySetId: string,
  localUris: string[],
): Promise<StoredImage[]> {
  const results: StoredImage[] = [];

  for (let i = 0; i < localUris.length; i++) {
    const uri = localUris[i];
    const ext = uri.split("?")[0].split(".").pop()?.toLowerCase() ?? "jpg";
    const contentType = ext === "png" ? "image/png" : "image/jpeg";
    const fileName = `photo-${i + 1}.${ext === "png" ? "png" : "jpg"}`;
    const storagePath = `${propertyId}/${keySetId}/${fileName}`;

    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();

    const { error } = await supabase.storage
      .from("properties")
      .upload(storagePath, arrayBuffer, { contentType, upsert: true });

    if (error) {
      throw new Error(
        `Failed to upload keyset photo ${i + 1}: ${error.message}`,
      );
    }

    results.push({
      path: `properties/${storagePath}`,
      sort_order: i + 1,
      is_hidden: false,
    });
  }

  return results;
}

/**
 * Patches the `images` column on a key_set row.
 * Call this after `uploadKeySetImages` to persist the storage paths.
 */
export async function updateKeySetImages(
  keySetId: string,
  images: StoredImage[],
): Promise<void> {
  const { error } = await supabase
    .from("key_sets")
    .update({ images })
    .eq("id", keySetId);

  if (error) throw error;
}

import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/utils/imageCompression";
import type {
  DbKeySet,
  DbKeySetInsert,
  DbKeySetUpdate,
  KeyType,
  StoredImage,
} from "@/types";

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
    unit_number: string | null;
    address: string;
    formatted_address: string | null;
    suburb: string;
    city: string;
    postcode: string | null;
  } | null;
  keys: { label: string; quantity: number | null }[];
};

/** A keyset that needs admin attention (overdue or missing/damaged). */
export type KeySetNeedingAttention = {
  id: string;
  property_id: string;
  name: string;
  status: "overdue" | "missing_damaged" | "checked_out";
  due_back_at: string | null;
  updated_at: string | null;
  keys: { label: string; quantity: number | null }[] | null;
  current_holder: {
    full_name: string | null;
    profile_id: string | null;
    holder_type: "agent" | "tenant" | "landlord";
    phone: string | null;
  } | null;
  property: {
    unit_number: string | null;
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
 * Fetch keysets currently checked out or overdue, limited to `limit` rows.
 *
 * When `holderProfileId` is provided, results are filtered server-side to
 * only the keysets held by that profile — used to scope agent dashboards to
 * their own holdings without over-fetching.
 */
export async function fetchCheckedOutKeySets({
  limit = 10,
  holderProfileId,
}: {
  limit?: number;
  holderProfileId?: string;
} = {}): Promise<CheckedOutKeySet[]> {
  let query = supabase
    .from("key_sets")
    .select(
      `
      id, property_id, name, code, status, due_back_at, current_holder_id,
      current_holder:current_holder_id!inner(full_name, holder_type, profile_id, phone),
      property:property_id(unit_number, address, formatted_address, suburb, city, postcode),
      keys(label, quantity)
    `,
    )
    .in("status", ["checked_out", "overdue"])
    .order("due_back_at", { ascending: true, nullsFirst: false })
    .limit(limit);

  if (holderProfileId) {
    query = query.eq("current_holder.profile_id", holderProfileId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as CheckedOutKeySet[];
}

/**
 * Fetch all keysets needing admin attention: overdue, missing/damaged,
 * or checked_out past their due date.
 */
export async function fetchKeySetsNeedingAttention(): Promise<
  KeySetNeedingAttention[]
> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("key_sets")
    .select(
      `
      id, property_id, name, status, due_back_at, updated_at,
      keys(label, quantity),
      current_holder:current_holder_id(full_name, holder_type, profile_id, phone),
      property:property_id(unit_number, address, suburb, city, postcode)
    `,
    )
    .or(
      `status.eq.overdue,status.eq.missing_damaged,and(status.eq.checked_out,due_back_at.lt.${now})`,
    )
    .order("status", { ascending: true })
    .order("due_back_at", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as unknown as KeySetNeedingAttention[];
}

/**
 * Paginated version of fetchCheckedOutKeySets for the Activity tab infinite list.
 * Only returns keysets that are checked out and NOT yet past their due date.
 * Overdue keysets (past due_back_at) are shown in the Needs Attention tab instead.
 */
export async function fetchCheckedOutKeySetsPaged({
  page = 0,
  pageSize = 20,
  holderProfileId,
}: {
  page?: number;
  pageSize?: number;
  holderProfileId?: string;
} = {}): Promise<CheckedOutKeySet[]> {
  const now = new Date().toISOString();
  let query = supabase
    .from("key_sets")
    .select(
      `
      id, property_id, name, code, status, due_back_at, current_holder_id,
      current_holder:current_holder_id!inner(full_name, holder_type, profile_id, phone),
      property:property_id(unit_number, address, formatted_address, suburb, city, postcode),
      keys(label, quantity)
    `,
    )
    .in("status", ["checked_out", "overdue"])
    // Exclude past-due items — those belong in Needs Attention
    .or(`due_back_at.is.null,due_back_at.gte.${now}`)
    .order("due_back_at", { ascending: true, nullsFirst: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (holderProfileId) {
    query = query.eq("current_holder.profile_id", holderProfileId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as CheckedOutKeySet[];
}

/**
 * Paginated version of fetchKeySetsNeedingAttention for the Activity tab infinite list.
 * Includes: status=overdue, status=missing_damaged, AND checked_out keysets
 * whose due_back_at has already passed (past-due regardless of DB status).
 */
export async function fetchKeySetsNeedingAttentionPaged({
  page = 0,
  pageSize = 20,
}: {
  page?: number;
  pageSize?: number;
} = {}): Promise<KeySetNeedingAttention[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("key_sets")
    .select(
      `
      id, property_id, name, status, due_back_at, updated_at,
      keys(label),
      current_holder:current_holder_id(full_name, holder_type, profile_id, phone),
      property:property_id(unit_number, address, suburb, city, postcode)
    `,
    )
    // overdue/missing_damaged by DB status, OR checked_out but past due date
    .or(
      `status.eq.overdue,status.eq.missing_damaged,and(status.eq.checked_out,due_back_at.lt.${now})`,
    )
    .order("status", { ascending: true })
    .order("due_back_at", { ascending: true, nullsFirst: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

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
 *
 * Each photo is compressed to ≤ 1 200 px wide JPEG before upload
 * (~150–300 KB vs 3–5 MB originals — roughly 15× storage savings).
 */
export async function uploadKeySetImages(
  propertyId: string,
  keySetId: string,
  localUris: string[],
): Promise<StoredImage[]> {
  const results: StoredImage[] = [];

  for (let i = 0; i < localUris.length; i++) {
    // Compress to JPEG before uploading
    const compressedUri = await compressImage(localUris[i]);
    const fileName = `photo-${i + 1}.jpg`;
    const storagePath = `${propertyId}/${keySetId}/${fileName}`;

    const response = await fetch(compressedUri);
    const arrayBuffer = await response.arrayBuffer();

    const { error } = await supabase.storage
      .from("properties")
      .upload(storagePath, arrayBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

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
 * Marks specific keysets as handed over to the tenant and sets the property
 * status to "leased" so it appears in the leased filter.
 * Creates a key_holder record for the tenant and links it to each key_set.
 */
export async function handoverKeysetsToTenant(
  propertyId: string,
  keySetIds: string[],
  tenantName: string,
  tenantPhone: string,
): Promise<void> {
  if (keySetIds.length === 0) return;

  // Create a key_holder record for the tenant
  const { data: holder, error: holderErr } = await supabase
    .from("key_holders")
    .insert({
      holder_type: "tenant",
      full_name: tenantName.trim(),
      phone: tenantPhone.trim() || null,
    })
    .select("id")
    .single();
  if (holderErr) throw holderErr;

  const { error: ksErr } = await supabase
    .from("key_sets")
    .update({ status: "handover_tenant", current_holder_id: holder.id })
    .in("id", keySetIds);
  if (ksErr) throw ksErr;

  const { error: propErr } = await supabase
    .from("properties")
    .update({ status: "leased" })
    .eq("id", propertyId);
  if (propErr) throw propErr;
}

/**
 * Collects keysets back from the tenant: clears holder, sets keysets to
 * "available", and sets the property back to "active".
 */
export async function collectKeysetsFromTenant(
  propertyId: string,
): Promise<void> {
  // Find all handover_tenant keysets for this property
  const { data: keySets, error: fetchErr } = await supabase
    .from("key_sets")
    .select("id")
    .eq("property_id", propertyId)
    .eq("status", "handover_tenant");
  if (fetchErr) throw fetchErr;

  if (keySets && keySets.length > 0) {
    const ids = keySets.map((ks) => ks.id);
    const { error: ksErr } = await supabase
      .from("key_sets")
      .update({ status: "available", current_holder_id: null })
      .in("id", ids);
    if (ksErr) throw ksErr;
  }

  const { error: propErr } = await supabase
    .from("properties")
    .update({ status: "active" })
    .eq("id", propertyId);
  if (propErr) throw propErr;
}

/**
 * Handover to landlord: marks all active keysets as `handover_landlord`
 * and sets the property status to `inactive`.
 */
export async function handoverPropertyToLandlord(
  propertyId: string,
): Promise<void> {
  const { error: ksErr } = await supabase
    .from("key_sets")
    .update({ status: "handover_landlord" })
    .eq("property_id", propertyId)
    .not("status", "in", '("inactive","missing_damaged")');
  if (ksErr) throw ksErr;

  const { error: propErr } = await supabase
    .from("properties")
    .update({ status: "inactive" })
    .eq("id", propertyId);
  if (propErr) throw propErr;
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

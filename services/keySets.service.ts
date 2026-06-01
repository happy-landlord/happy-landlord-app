import { supabase } from "@/lib/supabase";
import type {
  DbKeySet,
  DbKeySetInsert,
  DbKeySetUpdate,
  KeyType,
} from "@/types/database";

// ── Shared types ──────────────────────────────────────────────────────────────

export type KeySetImage = {
  path: string;
  sort_order: number;
  is_hidden: boolean;
};

export type KeyInSet = {
  id: string;
  key_type: KeyType;
  label: string;
  code: string | null;
  quantity: number;
  notes: string | null;
};

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

export type UnassignedKey = {
  id: string;
  key_type: KeyType;
  label: string;
  code: string | null;
  quantity: number;
  notes: string | null;
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
 * Marks a key set as missing/damaged.
 */
export async function reportKeySetLost(keySetId: string): Promise<void> {
  const { error } = await supabase
    .from("key_sets")
    .update({ status: "missing_damaged", updated_at: new Date().toISOString() })
    .eq("id", keySetId);

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

function stripKeySetBucketPrefix(path: string): string {
  return path.replace(/^key_sets\//, "");
}

export function getVisibleKeySetImages(images: KeySetImage[]): KeySetImage[] {
  return [...images]
    .filter((img) => !img.is_hidden)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export async function fetchSignedKeySetImageUrl(
  path: string,
  expiresIn = KEY_SET_SIGNED_URL_TTL,
): Promise<string | null> {
  if (!path) return null;
  const stripped = stripKeySetBucketPrefix(path);
  const { data, error } = await supabase.storage
    .from("key_sets")
    .createSignedUrl(stripped, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

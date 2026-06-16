/**
 * Shared key-related helpers used across the property/keys/keyset
 * create + edit flows. Centralising these avoids subtle drift in how
 * keys are labelled, deduped or matched across screens.
 */
import { KEY_TYPE_LABEL } from "@/constants";
import type { KeyType } from "@/types";

/** Minimal shape needed to label / dedupe a key. */
export type ComparableKey = {
  key_type: string;
  label?: string | null;
  code?: string | null;
};

/** Wizard-side draft key shape (from `components/property/add/types`). */
export type DraftKeyLike = {
  type: KeyType;
  otherLabel?: string | null;
};

/**
 * Resolves the user-facing name of a persisted key — uses the explicit
 * `label` first, falling back to the type label and finally the raw type.
 */
export function getKeyName(key: ComparableKey): string {
  return (
    key.label?.trim() ||
    KEY_TYPE_LABEL[key.key_type as KeyType] ||
    key.key_type
  ).trim();
}

/**
 * Stable signature used to match "same" keys (e.g. when merging an
 * unassigned key back into an assigned bucket). Lower-cased + trimmed
 * so trivial casing/whitespace differences don't create duplicates.
 */
export function getKeySignature(key: ComparableKey): string {
  return [
    key.key_type,
    getKeyName(key).toLocaleLowerCase(),
    (key.code ?? "").trim().toLocaleLowerCase(),
  ].join("::");
}

/**
 * Wizard-side label — `KeyEntry` uses a `.type` field and an optional
 * `otherLabel` override for `"other"` keys.
 */
export function getDraftKeyLabel(entry: DraftKeyLike): string {
  if (entry.type === "other" && entry.otherLabel) return entry.otherLabel;
  return KEY_TYPE_LABEL[entry.type] ?? entry.type;
}

// ── Key allocation helpers (add-property wizard) ─────────────────────────────

/** Minimal shape needed to allocate keys across keysets. */
export type AllocatableKey = { id: string; count: number };

/**
 * Counts how many copies of each key id are allocated across all keysets.
 * A key id appears once in `keyIds` per assigned copy.
 */
export function countAllocatedKeys(
  keySets: { keyIds: string[] }[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const ks of keySets) {
    for (const id of ks.keyIds) {
      counts[id] = (counts[id] ?? 0) + 1;
    }
  }
  return counts;
}

/**
 * Returns each key together with how many copies remain unallocated,
 * filtered to only those with a positive remaining quantity.
 */
export function getUnallocatedKeys<T extends AllocatableKey>(
  keys: T[],
  allocated: Record<string, number>,
): { key: T; quantity: number }[] {
  return keys
    .map((key) => ({
      key,
      quantity: Math.max(0, key.count - (allocated[key.id] ?? 0)),
    }))
    .filter(({ quantity }) => quantity > 0);
}

// ── Keyset-level helpers ─────────────────────────────────────────────────────

/** Minimum keyset shape needed to compute total key count. */
type KeySetWithKeys = {
  keys?: { quantity?: number | null }[] | null;
};

/** Sum of `quantity` across all keys in a keyset. */
export function getTotalKeyQuantity(keySet: KeySetWithKeys): number {
  return (keySet.keys ?? []).reduce(
    (sum, item) => sum + (item.quantity ?? 0),
    0,
  );
}

/** Visual tone used by keyset cards across admin / agent views. */
export type KeySetCardTone = "available" | "warning" | "danger" | "info";

type KeySetWithStatus = { status: string };

/** Maps a keyset status to a card tone. */
export function getKeySetTone(keySet: KeySetWithStatus): KeySetCardTone {
  if (keySet.status === "overdue" || keySet.status === "missing_damaged") {
    return "danger";
  }
  if (keySet.status === "available") return "available";
  if (
    keySet.status === "handover_tenant" ||
    keySet.status === "handover_landlord"
  ) {
    return "info";
  }
  return "warning";
}

/**
 * Returns the per-keyset code derived from the creation order.
 * Format: `S{n}` where n is 1-based (S1, S2, S3, …).
 *
 * Returns `null` when no property code has been generated yet (used by the
 * wizard UI to show a loading state for QR buttons).
 *
 * The `propertyCode` and `total` params are kept for API compatibility but
 * are no longer used in code construction — keyset codes are always S1, S2, etc.
 */
export function buildKeySetCode(
  propertyCode: string | null,
  index: number,
  _total: number,
): string | null {
  if (!propertyCode) return null;
  return `S${index + 1}`;
}

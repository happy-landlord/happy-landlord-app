import type { PlaceResult } from "@/components/ui/AddressSearch";
import type { KeyType, PropertyType } from "@/types/database";

// ── Wizard draft shapes ──────────────────────────────────────────────────────

export type PropertyStep = {
  propertyType: PropertyType;
  selectedPlace: PlaceResult | null;
  landlordName: string;
  landlordContact: string;
  dateReceived: Date;
};

/** A single key line-item in the wizard draft. Maps to one row in `keys`. */
export type KeyEntry = {
  id: string;
  type: KeyType;
  count: number;
  /** Optional code / tag number printed on the key (e.g. "K-01"). */
  code: string | null;
  /** Custom name used when type is "other". */
  otherLabel: string | null;
};

/** A keyset draft in the wizard — becomes one row in `key_sets` on save. */
export type KeySetDraft = {
  id: string;
  name: string;
  photoUris: string[];
  /** IDs of KeyEntry items (from step 1) to include in this keyset. */
  keyIds: string[];
};

// ── Property type options ────────────────────────────────────────────────────

export const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "house", label: "House" },
  { value: "townhouse", label: "Townhouse" },
  { value: "apartment", label: "Apartment" },
  { value: "unit", label: "Unit" },
  { value: "duplex", label: "Duplex" },
  { value: "villa", label: "Villa" },
  { value: "other", label: "Other" },
];

/** Lookup map derived from PROPERTY_TYPES — use instead of local duplicates. */
export const PROPERTY_TYPE_LABEL = Object.fromEntries(
  PROPERTY_TYPES.map(({ value, label }) => [value, label]),
) as Record<PropertyType, string>;

// ── Defaults & wizard steps ──────────────────────────────────────────────────

export const DEFAULT_PROPERTY: PropertyStep = {
  propertyType: "apartment",
  selectedPlace: null,
  landlordName: "",
  landlordContact: "",
  dateReceived: new Date(),
};

export const STEP_LABELS = ["Property", "Keysets", "Review"] as const;
export const TOTAL_STEPS = STEP_LABELS.length;

// ── Formatting helpers ───────────────────────────────────────────────────────

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Returns the per-keyset code derived from the property code.
 * - Single keyset → the property code itself.
 * - Multiple keysets → `${propertyCode}-${i+1}`.
 * - Returns `null` when no property code has been generated yet.
 */
export function buildKeySetCode(
  propertyCode: string | null,
  index: number,
  total: number,
): string | null {
  if (!propertyCode) return null;
  const upper = propertyCode.toUpperCase();
  return total === 1 ? upper : `${upper}-${index + 1}`;
}

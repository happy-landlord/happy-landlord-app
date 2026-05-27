import type { PlaceResult } from "@/components/ui/AddressSearch";
import type { DbProperty } from "@/types/database";
import type { KeyType } from "@/services/keys.service";

// Local aliases derived from the DB schema (single source of truth)
export type PropertyType = DbProperty["property_type"];
/** Wizard-only keyset category — not stored as a DB enum. */
export type KeySetType = "tenant" | "company" | "unused";
/** Key item type in the wizard draft — same union as the DB key_type column. */
export type KeyItemType = KeyType;

// ── Shared wizard types ───────────────────────────────────────────────────────

export type PropertyStep = {
  propertyType: PropertyType;
  selectedPlace: PlaceResult | null;
  landlordName: string;
  landlordContact: string;
  dateReceived: Date;
  /** TODO: upload to Supabase Storage before saving; store returned URLs, not local URIs */
  photoUris: string[];
  /** Generated as soon as an address is selected; used when saving */
  propertyCode: string | null;
};

/**
 * A single key line-item in the wizard draft.
 * Maps to KeyInventoryItem on DB write: { type, code: id, count }
 */
export type KeyEntry = {
  /** Local draft id — used as `code` on DB write, stripped from inventory if blank */
  id: string;
  /** Mirrors KeyInventoryItem.type — sourced from KeyItemType in database.ts */
  type: KeyItemType;
  /** Number of physical keys of this type. Maps to KeyInventoryItem.count */
  count: number;
};

export type KeySetDraft = {
  id: string;
  /** Mirrors DbKeySet.set_type */
  setType: KeySetType;
  label: string;
  keys: KeyEntry[];
  /** TODO: add notes TextInput back to KeysetsStep or remove this field if not needed */
  notes: string;
  /** Only used when setType === "tenant" */
  tenantName?: string;
  /** Only used when setType === "tenant" */
  tenantContact?: string;
  /** TODO: upload to Supabase Storage before saving; store returned URLs, not local URIs */
  photoUris?: string[];
};

// ── Property type options ─────────────────────────────────────────────────────

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
export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = Object.fromEntries(
  PROPERTY_TYPES.map(({ value, label }) => [value, label]),
) as Record<PropertyType, string>;

// ── Default form state ────────────────────────────────────────────────────────

export const DEFAULT_PROPERTY: PropertyStep = {
  propertyType: "apartment",
  selectedPlace: null,
  landlordName: "",
  landlordContact: "",
  dateReceived: new Date(),
  photoUris: [],
  propertyCode: null,
};

// ── Wizard steps ──────────────────────────────────────────────────────────────

export const STEP_LABELS = ["Property", "Keysets", "Review"] as const;
export const TOTAL_STEPS = STEP_LABELS.length;

// ── Helpers ───────────────────────────────────────────────────────────────────

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}


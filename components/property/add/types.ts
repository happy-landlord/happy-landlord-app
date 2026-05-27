import type { PlaceResult } from "@/components/ui/AddressSearch";
import type { DbProperty } from "@/types/database";
import type { KeyType } from "@/services/keys.service";

// ── Aliases derived from the DB schema (single source of truth) ──────────────

export type PropertyType = DbProperty["property_type"];
/** Key item type in the wizard draft — mirrors the DB `key_type` column. */
export type KeyItemType = KeyType;

// ── Wizard draft shapes ──────────────────────────────────────────────────────

export type PropertyStep = {
  propertyType: PropertyType;
  selectedPlace: PlaceResult | null;
  landlordName: string;
  landlordContact: string;
  dateReceived: Date;
  /** Local URIs from the picker; uploaded to Supabase Storage on save. */
  photoUris: string[];
  /** Generated as soon as an address is selected; used on save. */
  propertyCode: string | null;
};

/** A single key line-item in the wizard draft. Maps to one row in `keys`. */
export type KeyEntry = {
  id: string;
  type: KeyItemType;
  count: number;
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
  photoUris: [],
  propertyCode: null,
};

export const STEP_LABELS = ["Property", "Keys", "Review"] as const;
export const TOTAL_STEPS = STEP_LABELS.length;

// ── Formatting helpers ───────────────────────────────────────────────────────

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

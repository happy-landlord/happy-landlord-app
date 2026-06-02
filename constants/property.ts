/**
 * Property-type constants shared across screens and components.
 *
 * Single source of truth — derived once from `PROPERTY_TYPES` so the list
 * and the label lookup can never drift out of sync.
 */

import type { PropertyType } from "@/types";

/** Ordered list of property-type options used by pickers / dropdowns. */
export const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "house", label: "House" },
  { value: "townhouse", label: "Townhouse" },
  { value: "apartment", label: "Apartment" },
  { value: "unit", label: "Unit" },
  { value: "duplex", label: "Duplex" },
  { value: "villa", label: "Villa" },
  { value: "other", label: "Other" },
];

/** Lookup map: `PropertyType` → human-readable label. */
export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> =
  Object.fromEntries(
    PROPERTY_TYPES.map(({ value, label }) => [value, label]),
  ) as Record<PropertyType, string>;


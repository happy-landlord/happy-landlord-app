/**
 * Canonical address module — the single source of truth for property addresses.
 *
 * Everything address-related lives here so the four stages of an address never
 * drift apart:
 *
 *   1. PARSE    Google Places result → `ParsedAddress`      (parseGooglePlace)
 *   2. STORE    `ParsedAddress`       → DB columns           (buildAddressColumns)
 *   3. SEARCH   `ParsedAddress`       → search label         (placeSearchLabel)
 *   4. DISPLAY  DB property row       → human-readable text  (formatStreetLine,
 *                                                             formatShortAddress)
 *
 * This module has NO React/UI dependency, so it can be imported freely by
 * components, hooks and services alike without creating a layering cycle.
 */

import { AU_CBD_LOCALITIES } from "@/constants";

// ─────────────────────────────────────────────────────────────────────────────
// Domain type
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A fully-resolved address produced by selecting a Google Places suggestion
 * (or by the plain-text fallback when Places is disabled).
 *
 * This is the canonical shape passed around the add/edit property flows.
 * `AddressSearch` re-exports it as `PlaceResult` for backwards compatibility.
 */
export type ParsedAddress = {
  /** Google Place ID — empty string for the plain-text fallback. */
  placeId: string;
  /** Full human-readable address as shown in the Places suggestion. */
  description: string;
  /** Unit / apartment number, separate from the building street number. */
  unitNumber?: string;
  streetNumber?: string;
  street?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  country?: string;
  lat?: number;
  lng?: number;
};

/**
 * The address-related columns of the `properties` table. Produced by
 * `buildAddressColumns` and spread into an insert/update patch.
 */
export type AddressColumns = {
  address: string;
  unit_number: string | null;
  suburb: string;
  city: string;
  postcode: string | null;
  formatted_address: string;
  google_place_id: string;
  latitude: number | null;
  longitude: number | null;
};

/** Minimal property shape needed to render an address string. */
export type AddressDisplayFields = {
  unit_number?: string | null;
  address?: string | null;
  suburb?: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. PARSE — Google Places → ParsedAddress
// ─────────────────────────────────────────────────────────────────────────────

/** Raw `details` payload handed to us by react-native-google-places-autocomplete. */
export type GooglePlaceDetails = {
  address_components?: {
    types: string[];
    long_name: string;
    short_name: string;
  }[];
  geometry?: { location: { lat: number; lng: number } };
} | null;

/**
 * Normalises a raw suburb string returned by Google Places.
 *
 * Google returns the capital-city name (e.g. "Sydney") as the `locality` for
 * addresses inside a CBD postcode rather than a true suburb name. This replaces
 * those city names with "CBD" so the suburb field is always meaningful.
 * Returns `undefined` when `raw` is falsy.
 */
export function normaliseSuburb(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  return AU_CBD_LOCALITIES.has(raw.trim().toLowerCase()) ? "CBD" : raw;
}

/**
 * Parses a Google Places `onPress` result into a `ParsedAddress`.
 *
 * Handles the two ways Google encodes an Australian unit number:
 *   • a dedicated `subpremise` component (e.g. "Unit 4"), or
 *   • the slash format embedded in `street_number` (e.g. "4/12" → unit 4, bldg 12).
 *
 * It also recovers alphanumeric street-number suffixes (e.g. the "B" in "5B")
 * that Google's structured `street_number` component sometimes drops, by
 * cross-checking against the `description` text — which always preserves the
 * exact premises Google displayed (e.g. "i08/5B Halifax Street").
 */
export function parseGooglePlace(
  data: { place_id: string; description: string },
  details: GooglePlaceDetails,
): ParsedAddress {
  const components = details?.address_components ?? [];
  const get = (...types: string[]) =>
    components.find((c) => types.every((t) => c.types.includes(t)))?.long_name;
  const getShort = (...types: string[]) =>
    components.find((c) => types.every((t) => c.types.includes(t)))?.short_name;

  const route = get("route");
  const subpremise = get("subpremise");
  const rawStreetNumber = get("street_number") ?? "";

  let unitNumber: string | undefined;
  let streetNumber: string | undefined;

  if (subpremise) {
    // Explicit subpremise component: keep street_number as-is.
    unitNumber = subpremise.replace(/^unit\s*/i, "").trim() || undefined;
    streetNumber = rawStreetNumber || undefined;
  } else if (rawStreetNumber.includes("/")) {
    // Australian slash format "4/12": split into unit / building number.
    const slash = rawStreetNumber.indexOf("/");
    unitNumber = rawStreetNumber.slice(0, slash).trim() || undefined;
    streetNumber = rawStreetNumber.slice(slash + 1).trim() || undefined;
  } else {
    streetNumber = rawStreetNumber || undefined;
  }

  // Recover the street number's single-letter suffix (e.g. "5B") that Google's
  // structured `street_number` component sometimes drops ("5B" → "5"). Searches
  // the WHOLE description, so it works regardless of where the premises sits
  // ("102/5B Halifax St" or "Unit 102, 5B Halifax Street") and regardless of how
  // the street name is abbreviated.
  streetNumber =
    enrichStreetNumber(streetNumber, data.description) ?? streetNumber;

  // Fill in unit / street number from a leading "unit/street" premises token
  // when the structured components didn't supply them at all.
  const fromDesc = premisesFromDescription(data.description);
  if (fromDesc) {
    if (fromDesc.unitNumber && !unitNumber) unitNumber = fromDesc.unitNumber;
    if (fromDesc.streetNumber && !streetNumber)
      streetNumber = fromDesc.streetNumber;
  }

  return {
    placeId: data.place_id,
    description: data.description,
    unitNumber,
    streetNumber,
    street: route,
    suburb: normaliseSuburb(
      get("sublocality_level_1") ?? get("locality") ?? get("postal_town"),
    ),
    state: getShort("administrative_area_level_1"),
    postcode: get("postal_code"),
    country: get("country"),
    lat: details?.geometry?.location.lat,
    lng: details?.geometry?.location.lng,
  };
}

// Leading "unit/street-number" premises at the START of an address's first
// segment, e.g. "102/5B" in "102/5B Halifax Street" (unit "102", street "5B").
const LEADING_SLASH_PREMISES_RE =
  /^([A-Za-z0-9]+)\s*\/\s*(\d+[A-Za-z]?)(?=\s|,|$)/;
// A leading plain street number, e.g. "5B" in "5B Halifax Street".
const LEADING_STREET_NUMBER_RE = /^(\d+[A-Za-z]?)(?=\s|,|$)/;

/**
 * Extracts the premises token (unit + street number) from the START of a
 * Places `description`'s first segment.
 *
 * Anchoring on the start — rather than stripping the trailing street name —
 * means it doesn't matter that Google frequently abbreviates the street
 * differently in the prediction text ("Halifax Street") versus the structured
 * `route` component ("Halifax St"). Returns `null` when the segment doesn't
 * begin with a numeric premises, so the structured components stay the source
 * of truth for anything unusual (PO boxes, named buildings, "Shop 2", etc.).
 */
function premisesFromDescription(
  description: string,
): { unitNumber?: string; streetNumber?: string } | null {
  const firstSegment = description.split(",")[0]?.trim();
  if (!firstSegment) return null;

  const slash = firstSegment.match(LEADING_SLASH_PREMISES_RE);
  if (slash) return { unitNumber: slash[1], streetNumber: slash[2] };

  const plain = firstSegment.match(LEADING_STREET_NUMBER_RE);
  if (plain) return { streetNumber: plain[1] };

  return null;
}

/**
 * Recovers a dropped single-letter suffix on a street number (e.g. the "B" in
 * "5B") by scanning the full description for the known digits followed by
 * exactly one letter. Position-independent — works wherever the premises sits
 * in the text and whatever the street name abbreviation. Returns the enriched
 * number, or `undefined` when there is nothing to add (so the caller keeps the
 * structured value). Never changes the digits, so it can't pick a wrong number.
 */
function enrichStreetNumber(
  streetNumber: string | undefined,
  description: string,
): string | undefined {
  if (!streetNumber) return undefined;
  if (/[A-Za-z]$/.test(streetNumber)) return undefined; // already has a suffix
  const digits = streetNumber.match(/^\d+$/)?.[0];
  if (!digits) return undefined;
  // <digits><one letter>, bounded by non-alphanumerics so we don't match
  // inside larger tokens ("15B" when looking for "5", or a "5th" ordinal).
  const re = new RegExp(
    `(?:^|[^0-9A-Za-z])${digits}([A-Za-z])(?:[^0-9A-Za-z]|$)`,
  );
  const m = description.match(re);
  return m ? `${digits}${m[1]}` : undefined;
}

/** Builds the plain-text fallback address used when Google Places is disabled. */
export function plainTextAddress(text: string): ParsedAddress {
  const trimmed = text.trim();
  return { placeId: "", description: trimmed, suburb: trimmed };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. STORE — ParsedAddress → DB columns
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps a `ParsedAddress` to the `properties` table's address columns.
 *
 * Used by BOTH the create-property and edit-property flows so the mapping can
 * never diverge between them.
 *
 * Note on `city`: the schema keeps a legacy `city` column that the UI never
 * reads (all display/search uses `suburb`). Google doesn't give us a distinct
 * city separate from the suburb/locality, so we mirror the suburb here purely
 * to satisfy the column. Centralised in this one place rather than duplicated
 * at each call site.
 */
export function buildAddressColumns(place: ParsedAddress): AddressColumns {
  const streetLine =
    [place.streetNumber, place.street].filter(Boolean).join(" ") ||
    place.description;

  const suburb = place.suburb ?? "";

  return {
    address: streetLine,
    unit_number: place.unitNumber?.trim() || null,
    suburb,
    city: suburb || place.state || "",
    postcode: place.postcode ?? null,
    formatted_address: place.description,
    google_place_id: place.placeId,
    latitude: place.lat ?? null,
    longitude: place.lng ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SEARCH — ParsedAddress → search label
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Human-readable label for a selected place — prefers the suburb, falls back to
 * the first segment of the full description. Empty string when no place.
 */
export function placeSearchLabel(
  place: { suburb?: string; description?: string } | null | undefined,
): string {
  if (!place) return "";
  if (place.suburb) return place.suburb;
  return place.description?.split(",")[0]?.trim() ?? "";
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. DISPLAY — DB property row → human-readable text
// ─────────────────────────────────────────────────────────────────────────────

/** Formats a unit number as a label, e.g. "4" → "Unit 4", "Unit 4" → "Unit 4". */
function formatUnitLabel(unit: string | null | undefined): string | null {
  const trimmed = unit?.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase().startsWith("unit") ? trimmed : `Unit ${trimmed}`;
}

/**
 * Street line only — "Unit 4 12 Smith St". Used where the suburb is shown
 * separately (property cards, headers). Falls back to "Unknown address".
 */
export function formatStreetLine(
  property: AddressDisplayFields | null | undefined,
): string {
  if (!property) return "Unknown address";
  const parts = [
    formatUnitLabel(property.unit_number),
    property.address?.trim(),
  ];
  return parts.filter(Boolean).join(" ") || "Unknown address";
}

/**
 * Single-line full address — "Unit 4, 12 Smith St, Parramatta". Used where the
 * whole address must fit on one line (activity/history rows). Falls back to
 * "Property".
 */
export function formatShortAddress(
  property: AddressDisplayFields | null | undefined,
): string {
  if (!property) return "Property";
  const parts = [
    formatUnitLabel(property.unit_number),
    property.address?.trim(),
    property.suburb?.trim(),
  ];
  return parts.filter(Boolean).join(", ") || "Property";
}

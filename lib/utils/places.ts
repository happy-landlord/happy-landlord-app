/**
 * Utility helpers for Australian place / address data.
 */

import { AU_CBD_LOCALITIES } from "@/constants";

/**
 * Normalises a raw suburb string returned by Google Places.
 *
 * Google returns the capital-city name (e.g. "Sydney") as the `locality` for
 * addresses inside the CBD postcode rather than a true suburb name.
 * This function replaces those city names with "CBD" so the suburb field is
 * always meaningful.
 *
 * Returns `undefined` when `raw` is falsy.
 */
export function normaliseSuburb(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  return AU_CBD_LOCALITIES.has(raw.trim().toLowerCase()) ? "CBD" : raw;
}

/**
 * Returns a human-readable label for a selected place — prefers the suburb,
 * falls back to the first segment of the full description. Empty string when
 * no place is provided.
 */
export function placeSearchLabel(
  place: { suburb?: string; description?: string } | null | undefined,
): string {
  if (!place) return "";
  if (place.suburb) return place.suburb;
  return place.description?.split(",")[0]?.trim() ?? "";
}


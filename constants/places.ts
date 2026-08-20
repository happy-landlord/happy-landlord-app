/**
 * Australian places constants used for address search and suburb normalisation.
 */

// ── CBD locality names ────────────────────────────────────────────────────────
// Google Places returns the capital-city name (e.g. "Sydney") as the `locality`
// for addresses inside the CBD postcode.  This set drives the normalisation
// that replaces those city names with "CBD".
export const AU_CBD_LOCALITIES = new Set([
  "sydney",
  "melbourne",
  "brisbane",
  "perth",
  "adelaide",
  "hobart",
  "darwin",
  "canberra",
]);

// ── Location bias ─────────────────────────────────────────────────────────────
// Biases Google Places Autocomplete suggestions toward Greater Sydney.
// Soft bias only — addresses in other cities are still discoverable when the
// business expands beyond Sydney.
// Centre: Sydney CBD  |  Radius: 80 km  (covers Greater Sydney + surrounds)
export const SYDNEY_BIAS = {
  location: "-33.8688,151.2093",
  radius: "80000",
} as const;

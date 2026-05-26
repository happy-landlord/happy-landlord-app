/**
 * Australian places constants used for address search and suburb normalisation.
 */

// ── Greater Sydney council codes ──────────────────────────────────────────────
//
// Fixed 3-letter codes for every LGA currently serviced, keyed by the council's
// "core" name — lower-cased, with common council-type words stripped
// ("City Council", "Shire Council", "Municipal Council", "City of …", etc.).
//
// This matches the cleaning applied in councilTo3() in properties.service.ts.
// A lookup hit always wins over the dynamic first-3-chars fallback, so these
// codes are stable even if a council is renamed in the future.
//
// To add a new council:  add a lower-cased core-name → 3-letter code entry.
// Codes must be unique across this table.
//
//  Council (official name)              Core key             Code
// ──────────────────────────────────────────────────────────────────
export const COUNCIL_CODES: Record<string, string> = {
  bayside: "BAY", // Bayside Council
  blacktown: "BLK", // Blacktown City Council
  burwood: "BUR", // Burwood Council
  camden: "CAM", // Camden Council
  campbelltown: "CPL", // Campbelltown City Council
  "canterbury-bankstown": "CBK", // Canterbury-Bankstown Council
  "canada bay": "CNB", // City of Canada Bay
  parramatta: "PAR", // City of Parramatta
  ryde: "RYD", // City of Ryde
  sydney: "SYD", // City of Sydney
  cumberland: "CUM", // Cumberland City Council
  fairfield: "FAI", // Fairfield City Council
  "georges river": "GRV", // Georges River Council
  hawkesbury: "HWK", // Hawkesbury City Council
  hornsby: "HRN", // Hornsby Shire Council
  "hunters hill": "HNH", // Hunter's Hill Council
  "inner west": "INW", // Inner West Council
  "ku-ring-gai": "KRG", // Ku-ring-gai Council
  "lane cove": "LCV", // Lane Cove Council
  liverpool: "LIV", // Liverpool City Council
  mosman: "MOS", // Mosman Council
  "north sydney": "NSY", // North Sydney Council
  "northern beaches": "NBH", // Northern Beaches Council
  penrith: "PEN", // Penrith City Council
  randwick: "RAN", // Randwick City Council
  strathfield: "STR", // Strathfield Council
  sutherland: "SUT", // Sutherland Shire
  hills: "HLS", // Google may return "Hills Shire" → strips to "hills"
  waverley: "WAV", // Waverley Council
  willoughby: "WLB", // Willoughby City
  wollondilly: "WLD", // Wollondilly Shire
  woollahra: "WOL", // Woollahra Municipal Council
  "blue mountains": "BLM", // The Blue Mountains City Council
};

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

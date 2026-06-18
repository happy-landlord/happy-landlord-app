/**
 * Canonical Australian phone number utilities.
 *
 * Rule: ALL storage, auth, and API calls must use E.164: +614XXXXXXXX
 *       Display should use formatAustralianPhoneForDisplay → 0410 382 251
 *
 * ─── Accepted input formats ────────────────────────────────────────────────
 *   "0410 382 251"   → "+61410382251"
 *   "0410382251"     → "+61410382251"
 *   "410382251"      → "+61410382251"
 *   "61410382251"    → "+61410382251"
 *   "+61410382251"   → "+61410382251"  (identity)
 * ───────────────────────────────────────────────────────────────────────────
 */

// ── Normalise ────────────────────────────────────────────────────────────────

/**
 * Converts any Australian mobile input to E.164 format (+614XXXXXXXX).
 *
 * - Trims whitespace
 * - Strips spaces, dashes, and brackets
 * - Does NOT add a double `+`
 * - Returns the cleaned value unchanged if it cannot confidently normalise
 *   (e.g. empty string, non-numeric junk).
 */
export function normalizeAustralianPhone(input: string): string {
  const cleaned = input.trim().replace(/[\s\-()]/g, "");
  if (!cleaned) return cleaned;

  // Already correct E.164 → identity
  if (cleaned.startsWith("+61")) return cleaned;

  // Has a `+` but not `+61` — strip `+` and re-apply logic
  if (cleaned.startsWith("+")) {
    const inner = cleaned.slice(1);
    if (inner.startsWith("61")) return `+${inner}`;
    if (inner.startsWith("0")) return `+61${inner.slice(1)}`;
    return `+61${inner}`;
  }

  // 61xxxxxxxxx (11 digits, e.g. 61410382251) → +61xxxxxxxxx
  if (cleaned.startsWith("61") && cleaned.length >= 11) return `+${cleaned}`;

  // 04xxxxxxxx → +614xxxxxxxx
  if (cleaned.startsWith("0")) return `+61${cleaned.slice(1)}`;

  // 4xxxxxxxxx (bare subscriber number starting with 4) → +614xxxxxxxxx
  return `+61${cleaned}`;
}

// ── Validate ─────────────────────────────────────────────────────────────────

/**
 * Returns `true` only for the final canonical E.164 format: `+614XXXXXXXX`
 *
 * Rules:
 *  - Must start with `+614`
 *  - Exactly 9 digits after `+61` (8 more after the leading 4)
 *
 * Examples:
 *   +61410382251  → true
 *   61410382251   → false  (missing +)
 *   0410382251    → false  (local format, not yet normalised)
 *   +61123456789  → false  (not a mobile — doesn't start with 4)
 *   +6141038225   → false  (too short)
 *   +614103822511 → false  (too long)
 */
export function isValidAustralianMobile(phone: string): boolean {
  return /^\+614\d{8}$/.test(phone);
}

// ── Display ──────────────────────────────────────────────────────────────────

/**
 * Formats a stored E.164 mobile number into the friendly Australian style.
 *
 * Input : +61410382251
 * Output: 0410 382 251
 *
 * Returns the original string unchanged when it is not a valid canonical
 * Australian mobile (so it is safe to call on any value).
 */
export function formatAustralianPhoneForDisplay(phone: string): string {
  const match = phone.match(/^\+61(4\d{8})$/);
  if (!match) return phone;
  const d = match[1]; // "410382251"
  return `0${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

// ── Logging ──────────────────────────────────────────────────────────────────

/**
 * Returns a masked phone for safe console / error logging.
 *
 * +61410382251  → "+614*****251"
 *
 * Falls back to "***" for very short or empty strings.
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 6) return "***";
  return `${phone.slice(0, 4)}*****${phone.slice(-3)}`;
}


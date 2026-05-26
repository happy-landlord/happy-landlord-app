/**
 * Feature flags — flip a value here to enable or disable a whole feature
 * without touching any other file.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * BIOMETRIC_LOCK   (default: false)
 *
 *   true  → Face ID / Touch ID lock is active.
 *            • App shows the lock screen on cold-start when the user has
 *              opted in via Settings → Security.
 *            • First-login "Enable biometric?" prompt is shown.
 *            • The biometric toggle appears in Settings → Security.
 *
 *   false → Biometric lock is completely disabled.
 *            • Lock screen is never shown (app opens straight to content).
 *            • Enrolment prompt is suppressed.
 *            • The biometric row is hidden in Settings.
 *            • Recommended while testing in Expo Go (Face ID requires a
 *              custom dev build) or when rolling out to production gradually.
 * ─────────────────────────────────────────────────────────────────────────────
 * GOOGLE_PLACES    (default: true)
 *
 *   true  → Real Google Places Autocomplete is used for address search.
 *            Requires EXPO_PUBLIC_GOOGLE_PLACES_API_KEY to be set.
 *
 *   false → Google Places is bypassed; a plain text input is shown instead.
 *            The typed text is passed through as both the description and
 *            suburb so the rest of the app still receives a PlaceResult.
 *            Useful for web testing or when no API key is available.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const FEATURES = {
  BIOMETRIC_LOCK: false,
  GOOGLE_PLACES: true,
} as const;

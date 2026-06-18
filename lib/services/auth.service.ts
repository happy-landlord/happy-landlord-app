import { supabase } from "@/lib/supabase";
import {
  normalizeAustralianPhone,
  isValidAustralianMobile,
  maskPhone,
} from "@/lib/utils/phone";
// ── Phone normalisation ───────────────────────────────────────────────────────
/**
 * Validates a raw phone string for an Australian mobile.
 * Accepts any of the supported input formats (04xxx, +614xxx, 614xxx, 4xxx).
 * Returns an error message string, or null if valid.
 */
export function validateAuPhone(raw: string): string | null {
  const cleaned = raw.trim().replace(/[\s\-()]/g, "");
  if (!cleaned) return "Phone number is required";
  const normalised = normalizeAustralianPhone(raw);
  if (!isValidAustralianMobile(normalised)) {
    return "Enter a valid Australian mobile number (e.g. 0410 382 251)";
  }
  return null;
}
// ── OTP ───────────────────────────────────────────────────────────────────────
/**
 * Sends an SMS OTP to the given phone number.
 *
 * Login path  (no fullName) -> shouldCreateUser: false
 *   Supabase will reject the request with an error if the phone number has no
 *   existing auth user, so unregistered numbers never receive an OTP.
 *
 * Signup path (fullName supplied) -> shouldCreateUser: true (default)
 *   Supabase creates the auth user and fires the OTP. The DB trigger uses the
 *   fullName metadata to populate the pending profile row.
 */
export async function sendPhoneOtp(
  phone: string,
  fullName?: string,
): Promise<void> {
  const normalised = normalizeAustralianPhone(phone);
  if (__DEV__) {
    console.debug("[sendPhoneOtp] Sending OTP to", maskPhone(normalised));
  }
  const isSignup = Boolean(fullName);
  const { error } = await supabase.auth.signInWithOtp({
    phone: normalised,
    options: {
      // Prevent OTP being sent to phone numbers that have never registered.
      // Only the signup flow is allowed to create a new auth user.
      shouldCreateUser: isSignup,
      ...(isSignup
        ? {
            data: {
              full_name: fullName!.trim(),
              // Store E.164 (+614...) in user metadata for the DB trigger.
              phone: normalised,
            },
          }
        : {}),
    },
  });
  if (error) throw error;
}
/**
 * Verifies the SMS OTP code and establishes a Supabase session.
 */
export async function verifyPhoneOtp(
  phone: string,
  token: string,
): Promise<void> {
  const normalised = normalizeAustralianPhone(phone);
  const { error } = await supabase.auth.verifyOtp({
    phone: normalised,
    token: token.trim(),
    type: "sms",
  });
  if (error) throw error;
}

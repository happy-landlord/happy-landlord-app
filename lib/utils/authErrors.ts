/**
 * Maps raw Supabase auth error messages to friendly, user-facing copy.
 * Kept out of the screens so login, signup and settings share one source.
 */

type PhoneAuthMode = "login" | "register";

/** Humanises an OTP send (signInWithOtp) failure. */
export function humaniseSendError(
  message: string | null | undefined,
  mode: PhoneAuthMode,
): string {
  if (!message) return "Failed to send verification code. Please try again.";
  const lower = message.toLowerCase();

  if (
    mode === "login" &&
    (lower.includes("signups not allowed") ||
      lower.includes("user not found") ||
      lower.includes("no account") ||
      lower.includes("not registered"))
  ) {
    return "No account found for this number. Please sign up first.";
  }

  if (
    mode === "register" &&
    (lower.includes("already") ||
      lower.includes("exists") ||
      lower.includes("registered"))
  ) {
    return "This number is already registered. Please sign in instead.";
  }

  if (lower.includes("too many") || lower.includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  if (lower.includes("invalid") && lower.includes("phone")) {
    return "Invalid phone number. Please check and try again.";
  }

  return message;
}

/** Humanises an OTP verify failure. */
export function humaniseOtpError(message: string | null | undefined): string {
  if (!message) return "An unexpected error occurred. Please try again.";
  const lower = message.toLowerCase();

  if (lower.includes("expired") || lower.includes("token has expired")) {
    return "Your code has expired. Please request a new one.";
  }

  if (lower.includes("invalid") || lower.includes("otp")) {
    return "Incorrect code. Please check your SMS and try again.";
  }

  return message;
}


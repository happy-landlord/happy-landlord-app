/**
 * Shared error-handling helpers used across mutations, services, and UI.
 *
 * Centralising these prevents the
 *   `err instanceof Error ? err.message : "..."`
 * pattern from being re-implemented in every screen / hook.
 */

import { Alert } from "react-native";

/**
 * Best-effort extraction of a human-readable message from an unknown error.
 * Falls back to `fallback` (default: "Something went wrong.") when nothing
 * useful can be pulled off the value.
 */
export function getErrorMessage(
  err: unknown,
  fallback: string = "Something went wrong.",
): string {
  if (err instanceof Error) return err.message || fallback;
  if (typeof err === "string") return err || fallback;
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message: unknown }).message;
    if (typeof m === "string" && m.length > 0) return m;
  }
  return fallback;
}

/**
 * Shows a native alert with a derived error message.
 * Convenience wrapper around `Alert.alert(title, getErrorMessage(err))`.
 */
export function alertError(
  title: string,
  err: unknown,
  fallback: string = "Please try again.",
): void {
  Alert.alert(title, getErrorMessage(err, fallback));
}


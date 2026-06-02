/**
 * Time-math primitives shared across mutations and UI logic.
 *
 * Pure helpers — no React or runtime dependency. Prefer these over inline
 * `24 * 60 * 60 * 1000` math so units are self-documenting and consistent.
 */

export const SECOND_MS = 1_000;
export const MINUTE_MS = 60 * SECOND_MS;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

/** Returns a new Date `days` days after `from` (default: now). */
export function addDays(days: number, from: Date | number = Date.now()): Date {
  const base = typeof from === "number" ? from : from.getTime();
  return new Date(base + days * DAY_MS);
}

/** Returns a new Date `hours` hours after `from` (default: now). */
export function addHours(hours: number, from: Date | number = Date.now()): Date {
  const base = typeof from === "number" ? from : from.getTime();
  return new Date(base + hours * HOUR_MS);
}

/**
 * ISO timestamp `days` days in the future from `from` (default: now).
 * Convenience wrapper for the very common `due_back_at` calculation.
 */
export function isoInDays(days: number, from: Date | number = Date.now()): string {
  return addDays(days, from).toISOString();
}

/**
 * ISO timestamp `hours` hours in the future from `from` (default: now).
 */
export function isoInHours(hours: number, from: Date | number = Date.now()): string {
  return addHours(hours, from).toISOString();
}


/**
 * Locale-aware formatting helpers shared across screens.
 *
 * All helpers are pure functions; no React or runtime dependency.
 * Locale is currently hard-coded to en-AU per product spec.
 */
const LOCALE = "en-AU";
// ─── Primitive helpers ───────────────────────────────────────────────────────
/** Returns true when two Date objects fall on the same calendar day. */
export function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
/** Returns true when the given ISO due-date has already passed. */
export function isPastDue(dueBackAt: string | null): boolean {
  if (!dueBackAt) return false;
  const dueTime = new Date(dueBackAt).getTime();
  return !Number.isNaN(dueTime) && dueTime <= Date.now();
}
/** Formats an ISO timestamp as a short time string — e.g. "9:30 am". */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(LOCALE, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(LOCALE, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
export function toIsoDate(d: Date | null | undefined): string | undefined {
  if (!d) return undefined;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function formatLongDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(LOCALE, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
export function formatDueAt(iso: string): string {
  return `${formatShortDate(iso)} ${formatTime(iso)}`;
}
export type Remaining = {
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};
export function getRemainingTime(
  endAt: string,
  now: number = Date.now(),
): Remaining {
  const total = new Date(endAt).getTime() - now;
  const clamped = Math.max(0, total);
  return {
    total,
    days: Math.floor(clamped / 1000 / 60 / 60 / 24),
    hours: Math.floor((clamped / 1000 / 60 / 60) % 24),
    minutes: Math.floor((clamped / 1000 / 60) % 60),
    seconds: Math.floor((clamped / 1000) % 60),
  };
}
export function formatHMS({ hours, minutes, seconds }: Remaining): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
export function formatCountdown(r: Remaining): string {
  if (r.days >= 1) return `${r.days}d ${r.hours}h`;
  if (r.hours >= 1) return `${r.hours}h ${r.minutes}m`;
  if (r.minutes >= 1) return `${r.minutes}m ${r.seconds}s`;
  return "< 1m";
}
export function formatOverdueBy(
  dueBackAt: string | null | undefined,
): string | null {
  if (!dueBackAt) return null;
  const diff = Date.now() - new Date(dueBackAt).getTime();
  if (diff <= 0) return null;
  const totalMinutes = Math.floor(diff / 60_000);
  const days = Math.floor(totalMinutes / 60 / 24);
  const hours = Math.floor((totalMinutes / 60) % 24);
  const minutes = totalMinutes % 60;
  if (days >= 1) return `Overdue by ${days}d ${hours}h`;
  if (hours >= 1) return `Overdue by ${hours}h ${minutes}m`;
  if (minutes >= 1) return `Overdue by ${minutes}m`;
  return "Overdue by < 1m";
}
export function formatShortAddress(
  property:
    | {
        unit_number?: string | null;
        address?: string | null;
        suburb?: string | null;
      }
    | null
    | undefined,
): string {
  if (!property) return "Property";
  const unit = property.unit_number?.trim();
  const street = property.address?.trim();
  const suburb = property.suburb?.trim();
  const unitLabel = unit
    ? unit.toLowerCase().startsWith("unit")
      ? unit
      : `Unit ${unit}`
    : null;
  return [unitLabel, street, suburb].filter(Boolean).join(", ") || "Property";
}
export function formatStreetLine(
  property:
    | {
        unit_number?: string | null;
        address?: string | null;
      }
    | null
    | undefined,
): string {
  if (!property) return "Unknown address";
  const unit = property.unit_number?.trim();
  const street = property.address?.trim();
  const unitLabel = unit
    ? unit.toLowerCase().startsWith("unit")
      ? unit
      : `Unit ${unit}`
    : null;
  return [unitLabel, street].filter(Boolean).join(" ") || "Unknown address";
}
// ─── Date-label helpers ──────────────────────────────────────────────────────
export function toDateLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  if (isSameCalendarDay(date, now)) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameCalendarDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString(LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}
export function formatActivityTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return formatDateTime(iso);
  const now = new Date();
  const time = formatTime(iso);
  if (isSameCalendarDay(date, now)) return `Today at ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameCalendarDay(date, yesterday)) return `Yesterday at ${time}`;
  return formatDateTime(iso);
}
export function formatReturnDueLabel(dueBackAt: string | null): string {
  if (!dueBackAt) return "Return time not set";
  const dueDate = new Date(dueBackAt);
  if (Number.isNaN(dueDate.getTime())) return "Return time unavailable";
  const now = new Date();
  const time = formatTime(dueBackAt);
  const dateStr = dueDate.toLocaleDateString(LOCALE, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  if (isSameCalendarDay(dueDate, now)) return `Due today at ${time}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (isSameCalendarDay(dueDate, tomorrow)) return `Due tomorrow at ${time}`;
  return dueDate.getTime() < now.getTime()
    ? `Was due ${dateStr} at ${time}`
    : `Due ${dateStr} at ${time}`;
}
export function formatUntilTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const time = formatTime(iso);
  if (isSameCalendarDay(date, now)) return `today at ${time}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (isSameCalendarDay(date, tomorrow)) return `tomorrow at ${time}`;
  return (
    date.toLocaleDateString(LOCALE, {
      weekday: "short",
      day: "numeric",
      month: "short",
    }) + ` at ${time}`
  );
}
export function formatReturnTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  if (isSameCalendarDay(date, now)) return formatTime(iso);
  return date.toLocaleDateString(LOCALE, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
export function formatNotificationTimestamp(value: string | null): string {
  if (!value) return "Just now";
  const date = new Date(value);
  const now = new Date();
  if (isSameCalendarDay(date, now)) return formatTime(value);
  return date.toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "short",
  });
}
// u2500u2500u2500 People / contact helpers u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500
/**
 * Returns up to two uppercase initials derived from a person's name,
 * falling back to the first character of their email, or "?".
 */
export function getInitials(
  name?: string | null,
  email?: string | null,
): string {
  const cleanName = name?.trim();
  if (cleanName) {
    return cleanName
      .split(/\s+/)
      .map((word) => word[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }
  return (email?.trim()[0] ?? "?").toUpperCase();
}

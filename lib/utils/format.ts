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

/**
 * Formats an ISO timestamp as a short calendar date with weekday:
 * "Mon, 3 Jun". Used for compact "due" / "Was due" inline labels.
 */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(LOCALE, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/**
 * Formats a Date (or ISO string) as a long calendar date with full month:
 * "5 June 2025". Used in the add-property wizard and review screens.
 */
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

/**
 * Compact due-date label used on key checkout/return UI:
 * "Mon, 3 Jun 9:30 am" — date and time separated by a single space
 * (cleaner than the comma-heavy `formatDateTime` for inline labels).
 */
export function formatDueAt(iso: string): string {
  return `${formatShortDate(iso)} ${formatTime(iso)}`;
}

export type Remaining = {
  /** Milliseconds remaining; negative when past due. */
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export function getRemainingTime(endAt: string, now: number = Date.now()): Remaining {
  const total = new Date(endAt).getTime() - now;
  const clamped = Math.max(0, total);
  return {
    total,
    days:    Math.floor(clamped / 1000 / 60 / 60 / 24),
    hours:   Math.floor((clamped / 1000 / 60 / 60) % 24),
    minutes: Math.floor((clamped / 1000 / 60) % 60),
    seconds: Math.floor((clamped / 1000) % 60),
  };
}

export function formatHMS({ hours, minutes, seconds }: Remaining): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Human-readable countdown for multi-day checkout windows:
 * "2d 4h" | "4h 30m" | "45m 30s" | "< 1m"
 */
export function formatCountdown(r: Remaining): string {
  if (r.days >= 1)    return `${r.days}d ${r.hours}h`;
  if (r.hours >= 1)   return `${r.hours}h ${r.minutes}m`;
  if (r.minutes >= 1) return `${r.minutes}m ${r.seconds}s`;
  return "< 1m";
}

/**
 * Formats a property into a short human-readable address string.
 * Pattern: [Unit X, ][street address][, suburb]
 * Falls back to "Property" when no data is available.
 */
export function formatShortAddress(
  property: {
    unit_number?: string | null;
    address?: string | null;
    suburb?: string | null;
  } | null | undefined,
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

// ─── Date-label helpers ──────────────────────────────────────────────────────

/**
 * Converts an ISO timestamp to a human-friendly date label used for section
 * headers: "Today", "Yesterday", or a full locale date.
 */
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

/**
 * Formats an ISO timestamp as a contextual activity time:
 * "Today at 9:30 am", "Yesterday at 9:30 am", or a full date-time string.
 */
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

/**
 * Formats a due-back ISO timestamp into a human-readable label for the
 * checked-out keys panel:
 * "Due today at 9:30 am", "Due tomorrow at 9:30 am", "Was due …", "Due …"
 */
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

/**
 * Formats an ISO timestamp for a third-person "until …" context:
 * "today at 3:30 pm", "tomorrow at 9:00 am", or "Mon, 19 May at 2:00 pm".
 */
export function formatUntilTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const time = formatTime(iso);

  if (isSameCalendarDay(date, now)) return `today at ${time}`;

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (isSameCalendarDay(date, tomorrow)) return `tomorrow at ${time}`;

  return date.toLocaleDateString(LOCALE, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }) + ` at ${time}`;
}

/**
 * Formats an ISO timestamp for a keyset return-time context:
 * returns time-only when today, otherwise a short "Mon, d MMM" date.
 */
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

/**
 * Formats a nullable ISO timestamp for notification cards:
 * returns time-only when today (e.g. "9:30 am"), otherwise "d MMM" (e.g. "22 May").
 * Falls back to "Just now" when the value is null.
 */
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


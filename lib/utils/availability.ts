/**
 * Keyset availability helper — pure, dependency-free, unit-testable.
 *
 * Given a keyset + its active reservations + the current user's profile id,
 * returns a rich availability descriptor used to drive UI and action
 * visibility on the keyset detail screen.
 */

import type { KeySetWithDetails } from "@/lib/services/keySets.service";
import type { Reservation } from "@/lib/services/reservations.service";
import { formatTime } from "@/lib/utils/format";
import { DAY_MS, HOUR_MS } from "@/lib/utils/time";
import { DURATION_DAYS } from "@/constants";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AvailabilityState =
  | "available"
  | "reserved_by_me_now"
  | "reserved_by_other_now"
  | "reserved_later"
  | "checked_out"
  | "overdue"
  | "lost"
  | "inactive";

export type KeysetAvailability = {
  /** Short human-readable label for chips / banners. */
  label: string;
  state: AvailabilityState;
  canReserve: boolean;
  canCheckout: boolean;
  /** True when the current user has any active or upcoming reservation on this keyset. */
  canCancelReservation: boolean;
  /** The reservation that is active right now (starts_at <= now < ends_at). */
  activeReservation?: Reservation;
  /** The next upcoming reservation by anyone (starts_at > now). */
  nextReservation?: Reservation;
  /**
   * The current user's own reservation (active or upcoming).
   * Prefer this over `activeReservation`/`nextReservation` when you need to
   * cancel — those may belong to another user.
   */
  myReservation?: Reservation;
};

// ── Grace period ──────────────────────────────────────────────────────────────

/**
 * How long after `starts_at` a reservation is considered "voided" if the agent
 * has not yet checked out the keyset. Mirrors a server-side cleanup job — the
 * client filters these out so the UI doesn't keep blocking the keyset after a
 * no-show.
 */
export const RESERVATION_NO_SHOW_GRACE_MS = 8 * HOUR_MS;

export function isReservationVoidedByGrace(
  reservation: Reservation,
  nowMs: number = Date.now(),
): boolean {
  const startMs = new Date(reservation.starts_at).getTime();
  return nowMs > startMs + RESERVATION_NO_SHOW_GRACE_MS;
}

/** True for any of the three reservation-active states. */
export function isReservedState(state: AvailabilityState | undefined): boolean {
  return (
    state === "reserved_by_me_now" ||
    state === "reserved_by_other_now" ||
    state === "reserved_later"
  );
}

/**
 * Returns the subset of `DURATION_DAYS` that won't push the due date past the
 * next relevant reservation boundary.
 *
 * - `reserved_by_me_now`    → no cap (it's my reservation — full choice)
 * - `reserved_by_other_now` → cap at the other agent's reservation ends_at
 * - `reserved_later`        → cap at the next reservation's starts_at
 * - otherwise               → all options
 *
 * Always returns at least one option (defaults to the shortest duration when
 * all options would be filtered out).
 */
export function getAllowedCheckoutDays(
  availability: KeysetAvailability | undefined,
  durations: readonly number[] = DURATION_DAYS,
): readonly number[] {
  if (!availability) return durations;

  const now = Date.now();
  let limitMs: number | null = null;

  if (
    availability.state === "reserved_by_other_now" &&
    availability.activeReservation
  ) {
    limitMs = new Date(availability.activeReservation.ends_at).getTime();
  } else if (
    availability.state === "reserved_later" &&
    availability.nextReservation
  ) {
    limitMs = new Date(availability.nextReservation.starts_at).getTime();
  }

  if (limitMs === null) return durations;

  const maxDays = Math.floor((limitMs - now) / DAY_MS);
  const filtered = durations.filter((d) => d <= maxDays);
  return filtered.length > 0 ? filtered : durations.slice(0, 1);
}

// ── Helper ────────────────────────────────────────────────────────────────────

/**
 * Returns a compact time-range string for a reservation:
 * "2:00–4:00 pm" (share the meridiem when both in same half-day,
 * otherwise "2:00 pm–6:00 pm").
 */
function formatReservationRange(reservation: Reservation): string {
  const start = new Date(reservation.starts_at);
  const end = new Date(reservation.ends_at);
  const startStr = formatTime(reservation.starts_at);
  const endStr = formatTime(reservation.ends_at);

  // If same AM/PM meridiem, drop it from start
  const startMeridiem = start.getHours() < 12 ? "am" : "pm";
  const endMeridiem = end.getHours() < 12 ? "am" : "pm";
  if (startMeridiem === endMeridiem) {
    // Remove trailing "am"/"pm" from start
    const stripped = startStr.replace(/\s?(am|pm)$/i, "").trim();
    return `${stripped}–${endStr}`;
  }
  return `${startStr}–${endStr}`;
}

// ── Main export ───────────────────────────────────────────────────────────────

export function getKeysetAvailability({
  keySet,
  reservations,
  myProfileId,
  now = new Date(),
}: {
  keySet: KeySetWithDetails;
  reservations: Reservation[];
  /** Auth profile_id of the current user. Used to identify "my" reservations. */
  myProfileId: string | undefined;
  now?: Date;
}): KeysetAvailability {
  const nowMs = now.getTime();

  // Filter out reservations that have exceeded the no-show grace window —
  // they're effectively voided even if the backend hasn't cleaned them up yet.
  reservations = reservations.filter(
    (r) => !isReservationVoidedByGrace(r, nowMs),
  );

  // ── Hard status overrides ─────────────────────────────────────────────────
  if (keySet.status === "inactive") {
    return {
      label: "Inactive",
      state: "inactive",
      canReserve: false,
      canCheckout: false,
      canCancelReservation: false,
    };
  }

  if (keySet.status === "missing_damaged") {
    return {
      label: "Missing / Damaged",
      state: "lost",
      canReserve: false,
      canCheckout: false,
      canCancelReservation: false,
    };
  }

  if (keySet.status === "overdue") {
    return {
      label: "Overdue",
      state: "overdue",
      canReserve: false,
      canCheckout: false,
      canCancelReservation: false,
    };
  }

  if (keySet.status === "checked_out") {
    return {
      label: "Checked out",
      state: "checked_out",
      canReserve: false,
      canCheckout: false,
      canCancelReservation: false,
    };
  }

  if (
    keySet.status === "handover_tenant" ||
    keySet.status === "handover_landlord"
  ) {
    return {
      label: "Handed over",
      state: "inactive",
      canReserve: false,
      canCheckout: false,
      canCancelReservation: false,
    };
  }

  // keySet.status === 'available' ─────────────────────────────────────────────

  // Find a reservation that is currently active (window contains now)
  const activeReservation = reservations.find(
    (r) =>
      r.status === "active" &&
      new Date(r.starts_at).getTime() <= nowMs &&
      new Date(r.ends_at).getTime() > nowMs,
  );

  // Find the current user's own reservation (active window first, then upcoming)
  const myActiveReservation =
    myProfileId != null &&
    activeReservation?.reserved_by?.profile_id === myProfileId
      ? activeReservation
      : undefined;

  if (activeReservation) {
    const isMyReservation = myActiveReservation != null;

    if (isMyReservation) {
      return {
        label: "Reserved by you",
        state: "reserved_by_me_now",
        canReserve: false,
        canCheckout: true,
        canCancelReservation: true,
        activeReservation,
        myReservation: activeReservation,
      };
    }

    const holderName =
      activeReservation.reserved_by?.full_name ?? "another agent";
    return {
      label: `Reserved by ${holderName}`,
      state: "reserved_by_other_now",
      canReserve: false,
      // Another agent has the active reservation, but the keyset is still
      // physically available — allow checkout with a capped duration so it
      // is returned before the conflicting reservation window ends.
      canCheckout: true,
      canCancelReservation: false,
      activeReservation,
    };
  }

  // Find the next upcoming active reservation
  const upcomingReservations = reservations
    .filter(
      (r) => r.status === "active" && new Date(r.starts_at).getTime() > nowMs,
    )
    .sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    );

  const nextReservation = upcomingReservations[0];

  // Find the current user's own upcoming reservation (may not be the first one)
  const myUpcomingReservation =
    myProfileId != null
      ? upcomingReservations.find(
          (r) => r.reserved_by?.profile_id === myProfileId,
        )
      : undefined;

  if (nextReservation) {
    const range = formatReservationRange(nextReservation);
    const isMyNextReservation =
      nextReservation.reserved_by?.profile_id === myProfileId;

    return {
      label: isMyNextReservation
        ? `Your reservation ${range}`
        : `Reserved later ${range}`,
      state: "reserved_later",
      canReserve: true,
      canCheckout: true, // Backend is final authority on overlap
      canCancelReservation: myUpcomingReservation != null,
      nextReservation,
      myReservation: myUpcomingReservation,
    };
  }

  // No reservations at all
  return {
    label: "Available",
    state: "available",
    canReserve: true,
    canCheckout: true,
    canCancelReservation: false,
  };
}

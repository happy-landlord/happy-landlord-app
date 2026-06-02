/**
 * Keyset availability helper — pure, dependency-free, unit-testable.
 *
 * Given a keyset + its active reservations + the current user's profile id,
 * returns a rich availability descriptor used to drive UI and action
 * visibility on the keyset detail screen.
 */

import type { KeySetWithDetails } from "@/lib/services/keysets.service";
import type { Reservation } from "@/lib/services/reservations.service";
import { formatTime } from "@/lib/utils/format";

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
  /** True only when the current user has an active reservation on this keyset. */
  canCancelReservation: boolean;
  /** The reservation that is active right now (starts_at <= now < ends_at). */
  activeReservation?: Reservation;
  /** The next upcoming reservation (starts_at > now). */
  nextReservation?: Reservation;
};

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

  if (activeReservation) {
    const isMyReservation =
      myProfileId != null &&
      activeReservation.reserved_by?.profile_id === myProfileId;

    if (isMyReservation) {
      return {
        label: "Reserved by you",
        state: "reserved_by_me_now",
        canReserve: false,
        canCheckout: true,
        canCancelReservation: true,
        activeReservation,
      };
    }

    const holderName =
      activeReservation.reserved_by?.full_name ?? "another agent";
    return {
      label: `Reserved by ${holderName}`,
      state: "reserved_by_other_now",
      canReserve: false,
      canCheckout: false,
      canCancelReservation: false,
      activeReservation,
    };
  }

  // Find the next upcoming active reservation
  const upcomingReservations = reservations
    .filter(
      (r) =>
        r.status === "active" && new Date(r.starts_at).getTime() > nowMs,
    )
    .sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    );

  const nextReservation = upcomingReservations[0];

  if (nextReservation) {
    const range = formatReservationRange(nextReservation);
    const isMyNextReservation =
      myProfileId != null &&
      nextReservation.reserved_by?.profile_id === myProfileId;

    return {
      label: isMyNextReservation
        ? `Your reservation ${range}`
        : `Reserved later ${range}`,
      state: "reserved_later",
      canReserve: true,
      canCheckout: true, // Backend is final authority on overlap
      canCancelReservation: isMyNextReservation,
      nextReservation,
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


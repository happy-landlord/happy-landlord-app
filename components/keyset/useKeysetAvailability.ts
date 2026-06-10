import { useMemo } from "react";

import {
  useCurrentUserId,
  useKeySet,
  useKeySetReservations,
} from "@/lib/hooks";
import { getKeysetAvailability, type KeysetAvailability } from "@/lib/utils";
import type { KeySetWithDetails } from "@/lib/services";

/**
 * Resolve the reservation-aware availability descriptor for a keyset.
 *
 * Returns `undefined` until BOTH the keyset and its reservations have
 * resolved their initial fetch — otherwise callers would briefly render an
 * "Available" state while reservations are still loading, causing buttons
 * to flip from Reserve/Checkout to Cancel-Reservation as data streams in.
 */
export function useKeysetAvailability(
  keySetId: string | undefined,
): KeysetAvailability | undefined {
  const id = keySetId ?? "";
  const { data: keySet } = useKeySet(id);
  return useKeysetAvailabilityFor(keySet);
}

/**
 * Variant for callers that already have the keyset in hand (e.g. list
 * cards rendered inside a `useKeySets(propertyId)` result). Skips the
 * redundant per-card `useKeySet(id)` fetch — only the reservations
 * query fires. Eliminates the N+1 query pattern in keyset list views.
 */
export function useKeysetAvailabilityFor(
  keySet: KeySetWithDetails | null | undefined,
): KeysetAvailability | undefined {
  const id = keySet?.id ?? "";
  const { data: reservations, isPending: reservationsPending } =
    useKeySetReservations(id);
  const currentUserId = useCurrentUserId();

  return useMemo(() => {
    if (!keySet) return undefined;
    // Wait for the first reservations fetch so we don't flash the "available"
    // state before the real reservation list arrives.
    if (reservationsPending || !reservations) return undefined;
    return getKeysetAvailability({
      keySet,
      reservations,
      myProfileId: currentUserId,
    });
  }, [keySet, reservations, reservationsPending, currentUserId]);
}

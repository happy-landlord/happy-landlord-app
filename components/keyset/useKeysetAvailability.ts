import { useMemo } from "react";

import {
  useCurrentUserId,
  useKeySet,
  useKeySetReservations,
} from "@/lib/hooks";
import { getKeysetAvailability, type KeysetAvailability } from "@/lib/utils";

/**
 * Resolve the reservation-aware availability descriptor for a keyset.
 *
 * Composes `useKeySet`, `useKeySetReservations`, and `useCurrentUserId` so
 * that any component can read availability without the parent screen having
 * to drill it through props. TanStack Query dedupes the underlying requests,
 * so calling this from multiple sibling components is free.
 */
export function useKeysetAvailability(
  keySetId: string | undefined,
): KeysetAvailability | undefined {
  const id = keySetId ?? "";
  const { data: keySet } = useKeySet(id);
  const { data: reservations = [] } = useKeySetReservations(id);
  const currentUserId = useCurrentUserId();

  return useMemo(() => {
    if (!keySet) return undefined;
    return getKeysetAvailability({
      keySet,
      reservations,
      myProfileId: currentUserId,
    });
  }, [keySet, reservations, currentUserId]);
}


import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/lib/query";
import {
  fetchReservationsForKeySet,
  fetchMyReservations,
  reserveKeySet,
  cancelReservation,
  type ReserveKeySetParams,
} from "@/lib/services/reservations.service";
import { invalidateKeySets } from "@/lib/hooks/useKeySets";
import { RESERVATION_NO_SHOW_GRACE_MS } from "@/lib/utils";

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Returns all active + upcoming reservations for a keyset.
 * Refetch whenever a reserve/cancel mutation succeeds.
 */
export function useKeySetReservations(keySetId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.reservations.forKeySet(keySetId),
    queryFn: () => fetchReservationsForKeySet(keySetId),
    enabled: Boolean(keySetId),
    staleTime: 1000 * 30,
  });
}

/**
 * Returns all active, non-expired reservations belonging to the current agent,
 * enriched with keyset + property details.
 */
export function useMyReservations(profileId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.reservations.mine(profileId ?? ""),
    queryFn: async () => {
      const all = await fetchMyReservations(profileId!);
      // Hide reservations the agent never showed up for — server-side cleanup
      // may not have run yet, but functionally they're voided.
      const now = Date.now();
      return all.filter(
        (r) =>
          now <= new Date(r.starts_at).getTime() + RESERVATION_NO_SHOW_GRACE_MS,
      );
    },
    enabled: Boolean(profileId),
    staleTime: 1000 * 30,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useReserveKeySet(propertyId: string, keySetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: ReserveKeySetParams) => reserveKeySet(params),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.reservations.forKeySet(keySetId),
      });
      invalidateKeySets(queryClient, propertyId, keySetId);
    },
  });
}

export function useCancelReservation(propertyId: string, keySetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reservationId: string) => cancelReservation(reservationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.reservations.forKeySet(keySetId),
      });
      invalidateKeySets(queryClient, propertyId, keySetId);
    },
  });
}

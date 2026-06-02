import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/lib/query";
import {
  fetchReservationsForKeySet,
  reserveKeySet,
  cancelReservation,
  type ReserveKeySetParams,
} from "@/lib/services/reservations.service";
import { invalidateKeySets } from "@/lib/hooks/useKeySets";

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


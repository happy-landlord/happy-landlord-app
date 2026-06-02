import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/lib/query";
import {
  fetchKeySetsForProperty,
  fetchKeySetById,
  fetchUnassignedKeysForProperty,
  fetchCheckedOutKeySets,
  fetchKeySetsNeedingAttention,
  checkoutKeySet,
  returnKeySet,
  transferKeySet,
  extendKeySetCheckout,
  reportKeySetLost,
  undoReportKeySetLost,
  type CheckoutKeySetParams,
  type ReturnKeySetParams,
  type TransferKeySetParams,
  type ExtendKeySetParams,
} from "@/lib/services";
import {
  fetchAdminDashboardSummary,
  createKeys,
  updateKey,
  deleteKey,
} from "@/lib/services";
import type { DbKeyInsert, DbKeyUpdate } from "@/types";
import { useQueryScope } from "@/hooks";

// ── Key-set queries ───────────────────────────────────────────────────────────

export function useKeySets(propertyId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.keySets.byProperty(propertyId),
    queryFn: () => fetchKeySetsForProperty(propertyId),
    enabled: Boolean(propertyId),
    staleTime: 1000 * 30,
  });
}

export function useKeySet(keySetId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.keySets.detail(keySetId),
    queryFn: () => fetchKeySetById(keySetId),
    enabled: Boolean(keySetId),
    staleTime: 1000 * 30,
  });
}

export function useUnassignedKeys(propertyId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.keySets.unassigned(propertyId),
    queryFn: () => fetchUnassignedKeysForProperty(propertyId),
    enabled: Boolean(propertyId),
    staleTime: 1000 * 30,
  });
}

// ── Invalidation helper ───────────────────────────────────────────────────────

function invalidateKeySets(
  queryClient: ReturnType<typeof useQueryClient>,
  propertyId: string,
  keySetId?: string,
) {
  queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.keySets.byProperty(propertyId),
  });
  if (keySetId) {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.keySets.detail(keySetId),
    });
  }
  queryClient.invalidateQueries({ queryKey: ["activity"] });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCheckoutKeySet(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: CheckoutKeySetParams) => checkoutKeySet(params),
    onSuccess: (_, v) => invalidateKeySets(queryClient, propertyId, v.keySetId),
  });
}

export function useReturnKeySet(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: ReturnKeySetParams) => returnKeySet(params),
    onSuccess: (_, v) => invalidateKeySets(queryClient, propertyId, v.keySetId),
  });
}

export function useTransferKeySet(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: TransferKeySetParams) => transferKeySet(params),
    onSuccess: (_, v) => invalidateKeySets(queryClient, propertyId, v.keySetId),
  });
}

export function useExtendKeySet(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: ExtendKeySetParams) => extendKeySetCheckout(params),
    onSuccess: (_, v) => invalidateKeySets(queryClient, propertyId, v.keySetId),
  });
}

export function useReportKeySetLost(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keySetId: string) => reportKeySetLost(keySetId),
    onSuccess: (_, keySetId) =>
      invalidateKeySets(queryClient, propertyId, keySetId),
  });
}

export function useUndoReportKeySetLost(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keySetId: string) => undoReportKeySetLost(keySetId),
    onSuccess: (_, keySetId) =>
      invalidateKeySets(queryClient, propertyId, keySetId),
  });
}

// ── Key CRUD mutations (used by KeyEditSheet) ─────────────────────────────────

export function useCreateKeys(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inputs: DbKeyInsert[]) => createKeys(inputs),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.keySets.byProperty(propertyId),
      });
      queryClient.invalidateQueries({ queryKey: ["keySets"] });
    },
  });
}

export function useDeleteKey(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => deleteKey(keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.keySets.byProperty(propertyId),
      });
      queryClient.invalidateQueries({ queryKey: ["keySets"] });
    },
  });
}

export function useUpdateKey(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ keyId, patch }: { keyId: string; patch: DbKeyUpdate }) =>
      updateKey(keyId, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.keySets.byProperty(propertyId),
      });
      queryClient.invalidateQueries({ queryKey: ["keySets"] });
    },
  });
}

// ── Dashboard / attention hooks (legacy keys service) ────────────────────────

/**
 * Checked-out keysets for the dashboard.
 *
 * - Admins receive all checked-out / overdue keysets (up to `limit`).
 * - Agents receive only the keysets they currently hold — filtered
 *   server-side to avoid over-fetching.
 *
 * Query cache is partitioned by role + user id so that switching accounts
 * never returns stale data from a previous session.
 */
export function useCheckedOutKeySets(limit = 10) {
  const { userId, isAdmin, scope, ready } = useQueryScope();
  return useQuery({
    queryKey: [...QUERY_KEYS.keys.checkedOut(scope), limit],
    queryFn: () =>
      fetchCheckedOutKeySets({
        limit,
        holderProfileId: isAdmin ? undefined : userId,
      }),
    enabled: ready,
    staleTime: 1000 * 30,
  });
}

export function useAdminDashboardSummary() {
  return useQuery({
    queryKey: QUERY_KEYS.dashboard.counts,
    queryFn: fetchAdminDashboardSummary,
    staleTime: 1000 * 60 * 2,
  });
}

export function useKeySetsNeedingAttention() {
  const { ready } = useQueryScope();
  return useQuery({
    queryKey: QUERY_KEYS.dashboard.attention("admin"),
    queryFn: fetchKeySetsNeedingAttention,
    enabled: ready,
    staleTime: 1000 * 30,
  });
}

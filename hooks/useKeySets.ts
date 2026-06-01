import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/constants/queryKeys";
import {
  fetchKeySetsForProperty,
  fetchKeySetById,
  fetchUnassignedKeysForProperty,
  checkoutKeySet,
  returnKeySet,
  transferKeySet,
  extendKeySetCheckout,
  reportKeySetLost,
  type CheckoutKeySetParams,
  type ReturnKeySetParams,
  type TransferKeySetParams,
  type ExtendKeySetParams,
} from "@/services/keySets.service";
import {
  fetchKeyDashboardCounts,
  fetchKeysNeedingAttention,
  fetchCheckedOutKeys,
  createKeys,
  updateKey,
  deleteKey,
} from "@/services/keys.service";
import type { DbKeyInsert, DbKeyUpdate } from "@/types/database";
import { useQueryScope } from "@/hooks/useRole";

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
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.keySets.byProperty(propertyId) });
  if (keySetId) {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.keySets.detail(keySetId) });
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
    onSuccess: (_, keySetId) => invalidateKeySets(queryClient, propertyId, keySetId),
  });
}

// ── Key CRUD mutations (used by KeyEditSheet) ─────────────────────────────────

export function useCreateKeys(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inputs: DbKeyInsert[]) => createKeys(inputs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.keySets.byProperty(propertyId) });
      queryClient.invalidateQueries({ queryKey: ["keySets"] });
    },
  });
}

export function useDeleteKey(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => deleteKey(keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.keySets.byProperty(propertyId) });
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.keySets.byProperty(propertyId) });
      queryClient.invalidateQueries({ queryKey: ["keySets"] });
    },
  });
}

// ── Dashboard / attention hooks (legacy keys service) ────────────────────────

export function useCheckedOutKeys(limit = 5) {  const { userId, scope, ready } = useQueryScope();
  return useQuery({
    queryKey: [...QUERY_KEYS.keys.checkedOut(scope), limit],
    queryFn: () => fetchCheckedOutKeys({ userId: userId!, limit }),
    enabled: ready,
    staleTime: 1000 * 30,
  });
}

export function useKeyDashboardCounts() {
  return useQuery({
    queryKey: QUERY_KEYS.dashboard.counts,
    queryFn: fetchKeyDashboardCounts,
    staleTime: 1000 * 60 * 2,
  });
}

export function useKeysNeedingAttention() {
  const { userId, ready } = useQueryScope();
  return useQuery({
    queryKey: QUERY_KEYS.dashboard.attention(userId ?? "none"),
    queryFn: () => fetchKeysNeedingAttention(userId!),
    enabled: ready,
    staleTime: 1000 * 30,
  });
}

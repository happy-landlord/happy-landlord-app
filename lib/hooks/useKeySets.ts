import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/lib/query";
import {
  fetchKeySetById,
  fetchKeySetsForProperty,
  fetchUnassignedKeysForProperty,
  fetchCheckedOutKeySets,
  fetchKeySetsNeedingAttention,
  checkoutKeySet,
  returnKeySet,
  transferKeySet,
  extendKeySetCheckout,
  reportKeySetLost,
  undoReportKeySetLost,
  updateKeySet,
  handoverKeysetsToTenant,
  handoverPropertyToLandlord,
  collectKeysetsFromTenant,
  type CheckoutKeySetParams,
  type ReturnKeySetParams,
  type TransferKeySetParams,
  type ExtendKeySetParams,
  type KeyInSet,
  type UnassignedKey,
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

/**
 * Composite query that returns ALL keys belonging to a property — both
 * keys already assigned to a keyset (annotated with `keySetName`) and
 * the unassigned pool, in one flat list. Used by the property edit
 * sheet so the screen doesn't have to merge two queries inline.
 */
export type EnrichedKey = (KeyInSet | UnassignedKey) & {
  keySetName?: string;
};

export function useAllPropertyKeys(propertyId: string) {
  const keySetsQuery = useKeySets(propertyId);
  const unassignedQuery = useUnassignedKeys(propertyId);

  const allKeys = useMemo<EnrichedKey[]>(() => {
    const keySets = keySetsQuery.data ?? [];
    const unassigned = unassignedQuery.data ?? [];
    return [
      ...keySets.flatMap((ks) =>
        ks.keys.map((k) => ({ ...k, keySetName: ks.name })),
      ),
      ...unassigned,
    ];
  }, [keySetsQuery.data, unassignedQuery.data]);

  return {
    allKeys,
    isPending: keySetsQuery.isPending || unassignedQuery.isPending,
    isError: keySetsQuery.isError || unassignedQuery.isError,
  };
}

// ── Invalidation helper ───────────────────────────────────────────────────────

/**
 * Centralised cache invalidation for keyset-shaped mutations.
 * Exported so screen-level mutations (e.g. KeySetEditSheet's combined
 * assign/unassign flows) can reuse the exact same invalidation set
 * instead of cherry-picking query keys themselves.
 */
export function invalidateKeySets(
  queryClient: ReturnType<typeof useQueryClient>,
  propertyId: string,
  keySetId?: string,
) {
  queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.keySets.byProperty(propertyId),
  });
  queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.keySets.unassigned(propertyId),
  });
  if (keySetId) {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.keySets.detail(keySetId),
    });
  } else {
    // Key CRUD mutations are property-scoped and don't know which keyset
    // a key belongs to (it might be moving between keysets). Invalidate
    // every `keySets.detail(*)` query so any open keyset detail screen
    // refetches — otherwise the parent screen renders stale keys after an
    // assign/unassign and the edit sheet's UI doesn't update.
    queryClient.invalidateQueries({
      predicate: (q) =>
        Array.isArray(q.queryKey) &&
        q.queryKey[0] === "keySets" &&
        typeof q.queryKey[1] === "string" &&
        q.queryKey[1] !== "property" &&
        q.queryKey[1] !== "unassigned",
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

export function useHandoverToTenant(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ keySetIds, tenantName, tenantPhone }: { keySetIds: string[]; tenantName: string; tenantPhone: string }) =>
      handoverKeysetsToTenant(propertyId, keySetIds, tenantName, tenantPhone),
    onSuccess: () => {
      invalidateKeySets(queryClient, propertyId);
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}

export function useHandoverToLandlord(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => handoverPropertyToLandlord(propertyId),
    onSuccess: () => {
      invalidateKeySets(queryClient, propertyId);
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}

export function useCollectFromTenant(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => collectKeysetsFromTenant(propertyId),
    onSuccess: () => {
      invalidateKeySets(queryClient, propertyId);
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["propertyTenant", propertyId] });
    },
  });
}

// ── Key CRUD mutations (used by KeyEditSheet) ─────────────────────────────────

export function useCreateKeys(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inputs: DbKeyInsert[]) => createKeys(inputs),
    onSuccess: () => invalidateKeySets(queryClient, propertyId),
  });
}

export function useDeleteKey(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => deleteKey(keyId),
    onSuccess: () => invalidateKeySets(queryClient, propertyId),
  });
}

export function useUpdateKey(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ keyId, patch }: { keyId: string; patch: DbKeyUpdate }) =>
      updateKey(keyId, patch),
    onSuccess: () => invalidateKeySets(queryClient, propertyId),
  });
}

// ── Keyset metadata mutation ─────────────────────────────────────────────────

/**
 * Rename / patch a keyset (currently only `name` is exposed in the UI,
 * but the service accepts any subset of editable columns).
 */
export function useUpdateKeySet(propertyId: string, keySetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: { name?: string }) => updateKeySet(keySetId, patch),
    onSuccess: () => invalidateKeySets(queryClient, propertyId, keySetId),
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

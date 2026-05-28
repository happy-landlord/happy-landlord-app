import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/constants/queryKeys";
import {
  createKeys,
  deleteKey,
  fetchCheckedOutKeys,
  fetchKeyById,
  fetchKeyDashboardCounts,
  fetchKeysForProperty,
  fetchKeysNeedingAttention,
  updateKey,
} from "@/services/keys.service";
import { useQueryScope } from "@/hooks/useRole";
import type { DbKeyInsert, DbKeyUpdate } from "@/types/database";

export function useKeys(propertyId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.keys.byProperty(propertyId),
    queryFn: () => fetchKeysForProperty(propertyId),
    enabled: Boolean(propertyId),
    staleTime: 1000 * 30,
  });
}

export function useKey(keyId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.keys.detail(keyId),
    queryFn: () => fetchKeyById(keyId),
    enabled: Boolean(keyId),
    staleTime: 1000 * 30,
  });
}

export function useCheckedOutKeys(limit = 5) {
  const { userId, scope, ready } = useQueryScope();

  return useQuery({
    queryKey: [...QUERY_KEYS.keys.checkedOut(scope), limit],
    queryFn: () => fetchCheckedOutKeys({ userId: userId!, limit }),
    enabled: ready,
    staleTime: 1000 * 30,
  });
}

export function useCreateKeys(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inputs: DbKeyInsert[]) => createKeys(inputs),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.keys.byProperty(propertyId),
      });
    },
  });
}

export function useDeleteKey(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => deleteKey(keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.keys.byProperty(propertyId),
      });
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
        queryKey: QUERY_KEYS.keys.byProperty(propertyId),
      });
    },
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


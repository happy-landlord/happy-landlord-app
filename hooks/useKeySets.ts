import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/constants/queryKeys";
import {
  createKeys,
  fetchCheckedOutKeys,
  fetchKeyById,
  fetchKeysForProperty,
} from "@/services/keys.service";
import { useQueryScope } from "@/hooks/useRole";
import type { DbKeyInsert } from "@/types/database";

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
  const { userId, isAdmin, scope, ready } = useQueryScope();

  return useQuery({
    queryKey: [...QUERY_KEYS.keys.checkedOut(scope), limit],
    queryFn: () => fetchCheckedOutKeys({ userId: userId!, isAdmin, limit }),
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

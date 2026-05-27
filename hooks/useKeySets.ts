import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/constants/queryKeys";
import {
  createKeys,
  fetchCheckedOutKeys,
  fetchKeyById,
  fetchKeysForProperty,
} from "@/services/keys.service";
import { useRole } from "@/hooks/useRole";
import { useSession } from "@/hooks/useSession";
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
  const { session } = useSession();
  const { isAdmin, isLoading: roleLoading } = useRole();
  const userId = session?.user.id;
  const scope = isAdmin ? "admin" : userId ?? "none";

  return useQuery({
    queryKey: [...QUERY_KEYS.keys.checkedOut(scope), limit],
    queryFn: () => fetchCheckedOutKeys({ userId: userId!, isAdmin, limit }),
    enabled: !roleLoading && Boolean(userId),
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

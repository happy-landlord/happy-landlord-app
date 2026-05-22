import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/constants/queryKeys";
import {
  fetchCheckedOutKeySets,
  fetchKeySetById,
  fetchKeySetsForProperty,
  type FetchKeySetsOptions,
} from "@/services/keys.service";
import { useRole } from "@/hooks/useRole";
import { useSession } from "@/hooks/useSession";

export function useKeySets(
  propertyId: string,
  options: FetchKeySetsOptions = {}
) {
  const { setType } = options;
  return useQuery({
    queryKey: [...QUERY_KEYS.keys.byProperty(propertyId), setType ?? "all"],
    queryFn: () => fetchKeySetsForProperty(propertyId, { setType }),
    enabled: Boolean(propertyId),
    staleTime: 1000 * 30,
  });
}

export function useKeySet(keySetId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.keys.detail(keySetId),
    queryFn: () => fetchKeySetById(keySetId),
    enabled: Boolean(keySetId),
    staleTime: 1000 * 30,
  });
}

export function useCheckedOutKeySets(limit = 5) {
  const { session } = useSession();
  const { isAdmin, isLoading: roleLoading } = useRole();
  const userId = session?.user.id;
  const scope = isAdmin ? "admin" : userId ?? "none";

  return useQuery({
    queryKey: [...QUERY_KEYS.keys.checkedOut(scope), limit],
    queryFn: () => fetchCheckedOutKeySets({ userId: userId!, isAdmin, limit }),
    enabled: !roleLoading && Boolean(userId),
    staleTime: 1000 * 30,
  });
}

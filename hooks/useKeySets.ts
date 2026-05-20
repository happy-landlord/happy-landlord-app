import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/constants/queryKeys";
import {
  fetchKeySetsForProperty,
  type FetchKeySetsOptions,
} from "@/services/keys.service";

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

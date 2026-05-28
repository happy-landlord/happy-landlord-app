import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { QUERY_KEYS } from "@/constants/queryKeys";
import { useRole } from "@/hooks/useRole";
import {
  createProperty,
  fetchProperties,
  fetchPropertyById,
  fetchPropertyByIdForAgent,
  updateProperty,
  type Property,
  type PropertyKeyStatus,
} from "@/services/properties.service";
import type { DbPropertyInsert, DbPropertyUpdate } from "@/types/database";

const PAGE_SIZE = 20;

export function useInfiniteProperties({
  search = "",
  keyStatus,
}: { search?: string; keyStatus?: PropertyKeyStatus } = {}) {
  return useInfiniteQuery({
    queryKey: QUERY_KEYS.properties.infinite(search, keyStatus ?? ""),
    queryFn: ({ pageParam }: { pageParam: number }) =>
      fetchProperties({
        search,
        keyStatus,
        page: pageParam,
        pageSize: PAGE_SIZE,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage: Property[], allPages: Property[][]) =>
      lastPage.length === PAGE_SIZE ? allPages.length : undefined,
  });
}

export function useProperty(id: string) {
  const { isAdmin } = useRole();
  return useQuery({
    queryKey: QUERY_KEYS.properties.detail(id),
    queryFn: () =>
      isAdmin ? fetchPropertyById(id) : fetchPropertyByIdForAgent(id),
    enabled: !!id,
  });
}

export function useCreateProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DbPropertyInsert) => createProperty(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.properties.all });
    },
  });
}

export function useUpdateProperty(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: DbPropertyUpdate) => updateProperty(propertyId, patch),
    onSuccess: () => {
      // Re-fetch the detail (with landlord join) and mark list stale
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.properties.detail(propertyId)],
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.properties.all });
    },
  });
}

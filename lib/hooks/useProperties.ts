import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { QUERY_KEYS } from "@/lib/query";
import { invalidateProperties, PAGE_SIZE } from "@/lib/query";
import { useRole } from "@/hooks";
import {
  createProperty,
  fetchProperties,
  fetchPropertyById,
  fetchPropertyByIdForAgent,
  updateProperty,
} from "@/lib/services";
import type {
  DbProperty,
  DbPropertyInsert,
  DbPropertyUpdate,
  PropertyKeyStatus,
} from "@/types";

export function useInfiniteProperties({
  search = "",
  keyStatus,
}: { search?: string; keyStatus?: PropertyKeyStatus } = {}) {
  const query = useInfiniteQuery({
    queryKey: QUERY_KEYS.properties.infinite(search, keyStatus ?? ""),
    queryFn: ({ pageParam }: { pageParam: number }) =>
      fetchProperties({
        search,
        keyStatus,
        page: pageParam,
        pageSize: PAGE_SIZE,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage: DbProperty[], allPages: DbProperty[][]) =>
      lastPage.length === PAGE_SIZE ? allPages.length : undefined,
    // Flatten pages so consumers don't have to memoise this themselves.
    select: (data) => ({
      ...data,
      properties: data.pages.flat() as DbProperty[],
    }),
  });

  return {
    ...query,
    properties: query.data?.properties ?? [],
  };
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
    onSuccess: () => invalidateProperties(queryClient),
  });
}

export function useUpdateProperty(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: DbPropertyUpdate) => updateProperty(propertyId, patch),
    onSuccess: () => invalidateProperties(queryClient, propertyId),
  });
}

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
  type FetchPropertiesOptions,
  type Property,
  type PropertyKeyStatus,
} from "@/services/properties.service";
import type { DbPropertyInsert } from "@/types/database";

const PAGE_SIZE = 20;

export function useProperties(options: FetchPropertiesOptions = {}) {
  const { search = "", keyStatus } = options;
  return useQuery({
    queryKey: [...QUERY_KEYS.properties.all, search, keyStatus ?? "all"],
    queryFn: () => fetchProperties({ search, keyStatus }),
    staleTime: 1000 * 30,
  });
}

export function useInfiniteProperties(
  options: {
    search?: string;
    keyStatus?: PropertyKeyStatus;
  } = {},
) {
  const { search = "", keyStatus } = options;
  return useInfiniteQuery<Property[], Error>({
    queryKey: QUERY_KEYS.properties.infinite(search, keyStatus ?? "all"),
    queryFn: ({ pageParam }) =>
      fetchProperties({
        search,
        keyStatus,
        page: (pageParam as number) ?? 0,
        pageSize: PAGE_SIZE,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length : undefined,
    staleTime: 1000 * 30,
  });
}

export function useProperty(id: string) {
  const { isAdmin } = useRole();
  return useQuery({
    queryKey: [
      ...QUERY_KEYS.properties.detail(id),
      isAdmin ? "admin" : "agent",
    ],
    queryFn: () =>
      isAdmin ? fetchPropertyById(id) : fetchPropertyByIdForAgent(id),
    enabled: Boolean(id),
    staleTime: 1000 * 60,
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

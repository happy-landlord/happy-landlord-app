import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/constants/queryKeys";
import { useRole } from "@/hooks/useRole";
import {
  createProperty,
  fetchProperties,
  fetchPropertyById,
  fetchPropertyByIdForAgent,
  type FetchPropertiesOptions,
} from "@/services/properties.service";
import type { DbPropertyInsert } from "@/types/database";

export function useProperties(options: FetchPropertiesOptions = {}) {
  const { search = "", keyStatus } = options;
  return useQuery({
    queryKey: [...QUERY_KEYS.properties.all, search, keyStatus ?? "all"],
    queryFn: () => fetchProperties({ search, keyStatus }),
    staleTime: 1000 * 30,
  });
}

export function useProperty(id: string) {
  const { isAdmin } = useRole();
  return useQuery({
    queryKey: [...QUERY_KEYS.properties.detail(id), isAdmin ? "admin" : "agent"],
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


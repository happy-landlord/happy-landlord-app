import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/constants/queryKeys";
import { fetchProperties } from "@/services/properties.service";

export function useProperties(search?: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.properties.all, search ?? ""],
    queryFn: () => fetchProperties(search),
    staleTime: 1000 * 30,
  });
}

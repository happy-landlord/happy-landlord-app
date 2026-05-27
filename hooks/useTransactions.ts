import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { useQueryScope } from "@/hooks/useRole";
import {
  fetchMyActivity,
  fetchAllActivity,
  fetchActivity,
} from "@/services/transactions.service";
import type { ActivityTransaction } from "@/types/database";
export type { ActivityTransaction };

const ACTIVITY_PAGE_SIZE = 25;

export function useMyActivity() {
  const { userId, isAdmin, ready } = useQueryScope();
  return useQuery({
    queryKey: isAdmin
      ? QUERY_KEYS.activity.all
      : userId
        ? QUERY_KEYS.activity.mine(userId)
        : ["activity", "none"],
    queryFn: isAdmin ? fetchAllActivity : () => fetchMyActivity(userId!),
    enabled: ready,
    staleTime: 1000 * 30,
  });
}

export function useInfiniteActivity({
  search = "",
  propertyId,
}: {
  search?: string;
  propertyId?: string;
} = {}) {
  const { userId, isAdmin, scope, ready } = useQueryScope();

  return useInfiniteQuery<ActivityTransaction[], Error>({
    queryKey: QUERY_KEYS.activity.infinite(scope, search, propertyId),
    queryFn: ({ pageParam }) =>
      fetchActivity({
        userId: userId!,
        isAdmin,
        page: (pageParam as number) ?? 0,
        search,
        propertyId,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === ACTIVITY_PAGE_SIZE ? allPages.length : undefined,
    enabled: ready,
    staleTime: 1000 * 30,
  });
}

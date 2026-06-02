import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/query";
import { ACTIVITY_PAGE_SIZE, STALE_TIME } from "@/lib/query";
import { useQueryScope } from "@/hooks";
import {
  fetchMyActivity,
  fetchAllActivity,
  fetchActivity,
} from "@/lib/services";
import type { ActivityTransaction } from "@/types";

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
    staleTime: STALE_TIME.short,
  });
}

type UseInfiniteActivityOptions = {
  search?: string;
  propertyId?: string;
  keySetId?: string;
  /** Override the enabled flag. Defaults to true (fires whenever ready). */
  enabled?: boolean;
};

export function useInfiniteActivity({
  search = "",
  propertyId,
  keySetId,
  enabled: enabledOverride = true,
}: UseInfiniteActivityOptions = {}) {
  const { userId, isAdmin, scope, ready } = useQueryScope();

  return useInfiniteQuery<ActivityTransaction[], Error>({
    queryKey: QUERY_KEYS.activity.infinite(scope, search, propertyId, keySetId),
    queryFn: ({ pageParam }) =>
      fetchActivity({
        userId: userId!,
        isAdmin,
        page: (pageParam as number) ?? 0,
        search,
        propertyId,
        keySetId,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === ACTIVITY_PAGE_SIZE ? allPages.length : undefined,
    enabled: ready && enabledOverride,
    staleTime: STALE_TIME.short,
  });
}

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ACTIVITY_PAGE_SIZE, QUERY_KEYS, STALE_TIME } from "@/lib/query";
import { useQueryScope } from "@/hooks";
import {
  fetchMyActivity,
  fetchAllActivity,
  fetchActivity,
} from "@/lib/services";
import type { ActivityTransaction } from "@/types";

/**
 * Recent activity for the dashboard.
 *
 * - Admins see all recent activity.
 * - Agents see only their own activity.
 *
 * `enabled` lets callers suppress the query entirely (e.g. when the
 * dashboard section isn't shown for the current role).
 */
export function useMyActivity({ enabled = true }: { enabled?: boolean } = {}) {
  const { userId, isAdmin, ready } = useQueryScope();
  return useQuery({
    queryKey: isAdmin
      ? QUERY_KEYS.activity.all
      : userId
        ? QUERY_KEYS.activity.mine(userId)
        : ["activity", "none"],
    queryFn: isAdmin ? fetchAllActivity : () => fetchMyActivity(userId!),
    enabled: ready && enabled,
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

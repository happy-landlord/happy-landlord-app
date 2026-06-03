import { useCallback, useRef, useState } from "react";

/**
 * Manages pull-to-refresh state for one or more async refetch functions.
 *
 * Works with TanStack Query's `refetch` (returns a Promise) or any
 * async/sync function. All refetches run concurrently; `refreshing` stays
 * `true` until every promise settles.
 *
 * @example Single query
 *   const { refreshing, onRefresh } = useRefreshControl(refetch);
 *
 * @example Multiple queries (home dashboard)
 *   const { refreshing, onRefresh } = useRefreshControl(refetch1, refetch2, refetch3);
 *
 * @example Usage in JSX
 *   <ScrollView
 *     refreshControl={
 *       <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
 *     }
 *   >
 */
export function useRefreshControl(
  ...refetches: (() => Promise<unknown> | unknown)[]
) {
  const [refreshing, setRefreshing] = useState(false);

  // Keep a ref so the stable `onRefresh` callback always calls the latest fns
  // without needing them as useCallback dependencies.
  const refetchesRef = useRef(refetches);
  refetchesRef.current = refetches;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all(refetchesRef.current.map((fn) => fn()));
    } finally {
      setRefreshing(false);
    }
  }, []);

  return { refreshing, onRefresh };
}

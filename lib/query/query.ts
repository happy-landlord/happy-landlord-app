/**
 * Shared TanStack Query abstractions used across the app's tanstack hooks.
 *
 * Keeping these constants and invalidation helpers in one place lets us:
 *  - tune cache behaviour project-wide from a single file,
 *  - reuse multi-key invalidation logic (e.g. notifications list + unread
 *    count) without copy-pasting it into every mutation that touches them,
 *  - and avoid magic numbers (page sizes, stale times) scattered across hooks.
 */
import type { QueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/lib/query/keys";

// ── Pagination ───────────────────────────────────────────────────────────────

/** Default page size for paginated lists (properties, generic lists). */
export const PAGE_SIZE = 20;

/** Page size for the activity / transactions feed (slightly larger). */
export const ACTIVITY_PAGE_SIZE = 25;

// ── Stale-time presets ───────────────────────────────────────────────────────
// Use the named constants instead of inline `1000 * 60 * N` so we can adjust
// freshness policy in one place.

export const STALE_TIME = {
  /** 30 seconds — list views, frequently-changing data. */
  short: 1000 * 30,
  /** 2 minutes — dashboard counters etc. */
  medium: 1000 * 60 * 2,
  /** 5 minutes — rarely-changing reference data. */
  long: 1000 * 60 * 5,
} as const;

// ── Invalidation helpers ─────────────────────────────────────────────────────

/**
 * Invalidate every cache entry related to a property's keysets.
 * Used by all keyset/key mutations.
 */
export function invalidateKeySets(
  queryClient: QueryClient,
  propertyId: string,
  keySetId?: string,
) {
  queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.keySets.byProperty(propertyId),
  });
  if (keySetId) {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.keySets.detail(keySetId),
    });
  }
  queryClient.invalidateQueries({ queryKey: ["activity"] });
}

/**
 * Invalidate the property list and (optionally) a specific property detail.
 */
export function invalidateProperties(
  queryClient: QueryClient,
  propertyId?: string,
) {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.properties.all });
  if (propertyId) {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.properties.detail(propertyId),
    });
  }
}

/**
 * Invalidate both the notifications list and the unread-count badge.
 * The two are nearly always invalidated together — this helper keeps the
 * mutations consistent and removes the duplicated pair from every callsite.
 */
export function invalidateNotifications(
  queryClient: QueryClient,
  userId: string,
) {
  queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.notifications.all(userId),
  });
  queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.notifications.unreadCount(userId),
  });
}

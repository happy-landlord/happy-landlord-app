import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  EMPTY_ACTIVITY_FILTERS,
  type ActivityFilters,
} from "./ActivityFilterSheet";

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * URL search params the activity screen recognises.
 *
 * - `propertyId` / `keySetId` / `keySetName` — keyset/property context when
 *   the screen is entered from a keyset detail page.
 * - `myActivityOnly` — set to `"1"` (e.g. from the home dashboard "View all"
 *   link) to pre-enable the "My activity only" filter on mount.
 */
export type ActivityScreenParams = {
  propertyId?: string;
  keySetId?: string;
  keySetName?: string;
  myActivityOnly?: string;
};

export type UseActivityFiltersResult = {
  /** Current filter state. */
  filters: ActivityFilters;
  /** Merge a partial filter update. */
  patch: (patch: Partial<ActivityFilters>) => void;
  /** Reset filters back to {@link EMPTY_ACTIVITY_FILTERS}. */
  reset: () => void;
  /** Number of non-default filters currently applied. */
  activeCount: number;

  // Context from URL params — surfaced here so the screen has a single source
  // of truth and doesn't need to re-call `useLocalSearchParams` itself.
  propertyId?: string;
  keySetId?: string;
  keySetName?: string;
  /** Clears the keyset/property context from the URL. */
  clearKeysetParam: () => void;
};

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Owns all filter-related state for the Activity screen:
 *
 *   • Local filter state (`myActivityOnly`, `dateFrom`, `dateTo`)
 *   • Derived active-filter count (used for the badge + chip rendering)
 *   • URL-param ingestion: `?myActivityOnly=1` from deep links enables the
 *     filter on mount and is then cleared so the user can toggle it off
 *     normally without it re-applying.
 *   • Exposes the read-only keyset context params (`propertyId`, `keySetId`,
 *     `keySetName`) plus a `clearKeysetParam` helper for the "✕" chip.
 *
 * Keeping this off the screen means `activity.tsx` only deals with rendering
 * and the data query.
 */
export function useActivityFilters(): UseActivityFiltersResult {
  const router = useRouter();
  const {
    propertyId,
    keySetId,
    keySetName,
    myActivityOnly: myActivityParam,
  } = useLocalSearchParams<ActivityScreenParams>();

  const [filters, setFilters] = useState<ActivityFilters>(EMPTY_ACTIVITY_FILTERS);

  // ── URL → state sync ────────────────────────────────────────────────────
  // If launched via `?myActivityOnly=1`, enable the filter once on mount and
  // then drop the param. We deliberately don't keep the URL in sync with
  // every filter change — the param is a one-shot deep-link hint, not a
  // persisted view state.
  useEffect(() => {
    if (myActivityParam === "1") {
      setFilters((prev) => ({ ...prev, myActivityOnly: true }));
      router.setParams({ myActivityOnly: undefined });
    }
  }, [myActivityParam, router]);

  // ── Mutators ────────────────────────────────────────────────────────────
  const patch = useCallback((p: Partial<ActivityFilters>) => {
    setFilters((prev) => ({ ...prev, ...p }));
  }, []);

  const reset = useCallback(() => {
    setFilters(EMPTY_ACTIVITY_FILTERS);
  }, []);

  const clearKeysetParam = useCallback(() => {
    router.setParams({ keySetId: undefined, keySetName: undefined });
  }, [router]);

  // ── Derived ─────────────────────────────────────────────────────────────
  const activeCount = useMemo(
    () =>
      [
        filters.myActivityOnly,
        filters.dateFrom !== null,
        filters.dateTo !== null,
      ].filter(Boolean).length,
    [filters],
  );

  return {
    filters,
    patch,
    reset,
    activeCount,
    propertyId,
    keySetId,
    keySetName,
    clearKeysetParam,
  };
}


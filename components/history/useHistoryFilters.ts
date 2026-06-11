import { useCallback, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  EMPTY_HISTORY_FILTERS,
  type HistoryFilters,
} from "./HistoryFilterSheet";

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * URL search params the history screen recognises.
 *
 * - `propertyId` / `keySetId` / `keySetName` — keyset/property context when
 *   the screen is entered from a keyset detail page.
 */
export type HistoryScreenParams = {
  propertyId?: string;
  keySetId?: string;
  keySetName?: string;
};

export type UseHistoryFiltersResult = {
  /** Current filter state. */
  filters: HistoryFilters;
  /** Merge a partial filter update. */
  patch: (patch: Partial<HistoryFilters>) => void;
  /** Reset filters back to {@link EMPTY_HISTORY_FILTERS}. */
  reset: () => void;
  /** Number of non-default filters currently applied. */
  activeCount: number;

  propertyId?: string;
  keySetId?: string;
  keySetName?: string;
  /** Clears the keyset/property context from the URL. */
  clearKeysetParam: () => void;
};

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Owns all filter-related state for the History screen.
 */
export function useHistoryFilters(): UseHistoryFiltersResult {
  const router = useRouter();
  const {
    propertyId,
    keySetId,
    keySetName,
  } = useLocalSearchParams<HistoryScreenParams>();

  const [filters, setFilters] = useState<HistoryFilters>(EMPTY_HISTORY_FILTERS);


  const patch = useCallback((p: Partial<HistoryFilters>) => {
    setFilters((prev) => ({ ...prev, ...p }));
  }, []);

  const reset = useCallback(() => {
    setFilters(EMPTY_HISTORY_FILTERS);
  }, []);

  const clearKeysetParam = useCallback(() => {
    router.setParams({ keySetId: undefined, keySetName: undefined });
  }, [router]);

  const activeCount = useMemo(
    () =>
      [
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


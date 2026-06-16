import { useCallback, useMemo, useState } from "react";

import { fetchNextPropertyCodeSeq, makePropertyCode } from "@/lib/services";
import type { PlaceResult } from "@/components/ui";
import type { PropertyType } from "@/types";

type Fetched = { suburb: string; seq: number } | null;

type UsePropertyCodeResult = {
  /** Whether we're currently fetching the next sequence number. */
  loading: boolean;
  /** Resolved property code, or null until generation completes. */
  code: string | null;
  /** Trigger generation for a newly selected place. */
  generate: (place: PlaceResult) => Promise<void>;
  /** Reset to initial state. */
  reset: () => void;
};

/**
 * Generates and maintains the property code.
 *
 * New format: `{SUBURB3}-{DEV_CODE}{SEQ2}`   e.g. `PAR-LEN01`
 *
 * Design notes:
 *  - The sequence is fetched once when an address is selected (based on suburb).
 *  - The code is derived reactively from the stored suburb+seq and the current
 *    `developerName` / `propertyType`, so it updates live as the user edits
 *    those fields without requiring another DB round-trip.
 *  - When `developerName` is blank the property-type letter is used as fallback
 *    (e.g. "A" for apartment, "H" for house).
 */
export function usePropertyCode(
  _place: PlaceResult | null,
  developerName: string,
  propertyType: PropertyType,
): UsePropertyCodeResult {
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState<Fetched>(null);

  // Derive the display code reactively whenever developerName or propertyType changes.
  const code = useMemo(() => {
    if (!fetched) return null;
    return makePropertyCode(fetched.suburb, developerName, propertyType, fetched.seq);
  }, [fetched, developerName, propertyType]);

  const generate = useCallback(async (nextPlace: PlaceResult) => {
    setFetched(null);
    setLoading(true);
    try {
      const suburb = nextPlace.suburb ?? "";
      const seq = await fetchNextPropertyCodeSeq(suburb);
      setFetched({ suburb, seq });
    } catch {
      setFetched(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setFetched(null);
    setLoading(false);
  }, []);

  return { loading, code, generate, reset };
}

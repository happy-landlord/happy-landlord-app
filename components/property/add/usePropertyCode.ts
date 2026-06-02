import { useCallback, useEffect, useState } from "react";

import {
  fetchNextPropertyCodeSeq,
  makePropertyCode,
  PROPERTY_TYPE_LETTERS,
} from "@/lib/services";
import type { PlaceResult } from "@/components/ui";
import type { PropertyType } from "@/types";

type UsePropertyCodeResult = {
  /** Whether we're currently fetching the next sequence number. */
  loading: boolean;
  /** Resolved property code, or null until generation completes. */
  code: string | null;
  /** Trigger generation for a newly selected place. */
  generate: (place: PlaceResult, propertyType: PropertyType) => Promise<void>;
  /** Reset to initial state. */
  reset: () => void;
};

/**
 * Generates the property code from a selected address and keeps the
 * property-type letter (3rd segment, 1st char) in sync when the user
 * later changes the property type.
 *
 *   Code format: {COUNCIL}-{SUBURB}-{TYPE}{SEQ3}   e.g. SYD-CBD-A001
 */
export function usePropertyCode(
  place: PlaceResult | null,
  propertyType: PropertyType,
): UsePropertyCodeResult {
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState<string | null>(null);

  const generate = useCallback(
    async (nextPlace: PlaceResult, type: PropertyType) => {
      setCode(null);
      setLoading(true);
      try {
        const council = nextPlace.council ?? nextPlace.suburb ?? "";
        const suburb = nextPlace.suburb ?? "";
        const seq = await fetchNextPropertyCodeSeq(council, suburb);
        setCode(makePropertyCode(council, suburb, type, seq));
      } catch {
        setCode(null);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setCode(null);
    setLoading(false);
  }, []);

  // Sync the type letter when propertyType changes after the code is set.
  useEffect(() => {
    if (!place || !code) return;
    const parts = code.split("-");
    if (parts.length !== 3) return;
    const newLetter = PROPERTY_TYPE_LETTERS[propertyType] ?? "O";
    const newSegment = `${newLetter}${parts[2].slice(1)}`;
    if (newSegment === parts[2]) return;
    setCode(`${parts[0]}-${parts[1]}-${newSegment}`);
  }, [propertyType, place, code]);

  return { loading, code, generate, reset };
}

import { useCallback, useState } from "react";

import { fetchPropertyByPlaceId } from "@/lib/services";
import type { PlaceResult } from "@/components/ui";

export interface UseAddressDuplicateCheckOptions {
  /** Property id to ignore when matching (so editing a property doesn't flag itself). */
  excludePropertyId?: string;
  /** Side-effect fired when a place is picked (e.g. regenerate the property code). */
  onSelect?: (place: PlaceResult) => void;
}

/**
 * Shared address picker + duplicate-check state for the add- and edit-property
 * flows. On select it stores the place, clears any prior error and checks the
 * backend for an existing property at the same address, surfacing a warning.
 */
export function useAddressDuplicateCheck(
  options?: UseAddressDuplicateCheckOptions,
) {
  const { excludePropertyId, onSelect } = options ?? {};

  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressChecking, setAddressChecking] = useState(false);

  const onAddressSelect = useCallback(
    async (place: PlaceResult) => {
      setSelectedPlace(place);
      onSelect?.(place);
      setAddressError(null);
      if (!place.placeId) return;

      setAddressChecking(true);
      try {
        const unit = place.unitNumber?.trim() || null;
        const existing = await fetchPropertyByPlaceId(place.placeId, unit);
        if (existing && existing.id !== excludePropertyId) {
          setAddressError("A property already exists at this address.");
        }
      } catch {
        // Silently ignore network errors — don't block the user.
      } finally {
        setAddressChecking(false);
      }
    },
    [excludePropertyId, onSelect],
  );

  return { selectedPlace, addressError, addressChecking, onAddressSelect };
}


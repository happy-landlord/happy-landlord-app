/**
 * Layout constants shared across screens.
 *
 * Centralises values that otherwise get hard-coded into screen paddings
 * and offsets (most often: the height of the floating bottom-nav).
 */

import { useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Height (in px) reserved at the bottom of scrollable screens to clear the
 * floating bottom-nav. Tune in lockstep with `components/BottomNav.tsx`.
 */
export const BOTTOM_NAV_HEIGHT = 96;

/**
 * Returns the contentContainer paddingBottom needed for a scrollable screen
 * to clear the bottom-nav while respecting the device's safe-area inset.
 *
 * Optional `extra` adds additional spacing on top of the nav clearance.
 */
export function useBottomListPadding(extra: number = 0): number {
  const insets = useSafeAreaInsets();
  return useMemo(
    () => insets.bottom + BOTTOM_NAV_HEIGHT + extra,
    [insets.bottom, extra],
  );
}


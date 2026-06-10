import { Pressable, StyleSheet, View } from "react-native";
import { KeyRound } from "lucide-react-native";

import { Pill } from "@/components/ui";
import { theme } from "@/constants";
import { toIsoDate } from "@/lib/utils";

import type { ActivityFilters } from "./ActivityFilterSheet";

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  filters: ActivityFilters;
  /** Optional keyset context chip — rendered first when present. */
  keySetId?: string;
  keySetName?: string;
  /** Remove the keyset context chip. */
  onClearKeyset: () => void;
  /** Apply a partial filter change (used by chip ✕ buttons). */
  onPatch: (patch: Partial<ActivityFilters>) => void;
};

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Horizontal, wrap-aware row of active-filter pills shown above the activity
 * list. Each chip's ✕ removes only its own filter, leaving the others intact.
 *
 * The parent (`activity.tsx`) is responsible for deciding *whether* to render
 * the row at all — typically gated on `keySetId || activeFilterCount > 0`.
 * This component just renders whatever's currently active.
 *
 * Chip taxonomy:
 *   • Keyset context — primary, with key icon, removes URL params
 *   • My activity   — primary
 *   • Date from     — neutral
 *   • Date to       — neutral
 */
export function ActivityFilterChips({
  filters,
  keySetId,
  keySetName,
  onClearKeyset,
  onPatch,
}: Props) {
  const { myActivityOnly, dateFrom, dateTo } = filters;

  // Nothing to show — render nothing (parent can also gate, but this keeps
  // the component safe to drop in unconditionally).
  if (!keySetId && !myActivityOnly && !dateFrom && !dateTo) return null;

  return (
    <View style={styles.row}>
      {keySetId && (
        <Pressable
          onPress={onClearKeyset}
          accessibilityRole="button"
          accessibilityLabel="Clear keyset filter"
        >
          <Pill
            tone="accent"
            variant="soft"
            leading={
              <KeyRound size={13} color={theme.colors.accent} strokeWidth={2} />
            }
          >
            {`${keySetName ?? "Keyset"}   ✕`}
          </Pill>
        </Pressable>
      )}

      {myActivityOnly && (
        <Pressable
          onPress={() => onPatch({ myActivityOnly: false })}
          accessibilityRole="button"
          accessibilityLabel="Remove my activity filter"
        >
          <Pill tone="accent" variant="soft">
            {"My activity   ✕"}
          </Pill>
        </Pressable>
      )}

      {dateFrom && (
        <Pressable
          onPress={() => onPatch({ dateFrom: null })}
          accessibilityRole="button"
          accessibilityLabel="Remove from-date filter"
        >
          <Pill tone="neutral" variant="soft">
            {`From ${toIsoDate(dateFrom)}   ✕`}
          </Pill>
        </Pressable>
      )}

      {dateTo && (
        <Pressable
          onPress={() => onPatch({ dateTo: null })}
          accessibilityRole="button"
          accessibilityLabel="Remove to-date filter"
        >
          <Pill tone="neutral" variant="soft">
            {`To ${toIsoDate(dateTo)}   ✕`}
          </Pill>
        </Pressable>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
    marginHorizontal: theme.spacing.screen,
    marginBottom: theme.spacing.sm,
  },
});

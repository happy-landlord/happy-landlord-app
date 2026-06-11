import { Pressable, StyleSheet, View } from "react-native";
import { KeyRound } from "lucide-react-native";

import { Pill } from "@/components/ui";
import { theme } from "@/constants";
import { toIsoDate } from "@/lib/utils";

import type { HistoryFilters } from "./HistoryFilterSheet";

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  filters: HistoryFilters;
  /** Optional keyset context chip — rendered first when present. */
  keySetId?: string;
  keySetName?: string;
  /** Remove the keyset context chip. */
  onClearKeyset: () => void;
  /** Apply a partial filter change (used by chip ✕ buttons). */
  onPatch: (patch: Partial<HistoryFilters>) => void;
};

// ── Component ─────────────────────────────────────────────────────────────────

export function HistoryFilterChips({
  filters,
  keySetId,
  keySetName,
  onClearKeyset,
  onPatch,
}: Props) {
  const { dateFrom, dateTo } = filters;

  if (!keySetId && !dateFrom && !dateTo) return null;

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


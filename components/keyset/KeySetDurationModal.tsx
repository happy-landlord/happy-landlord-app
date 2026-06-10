import { Pressable, StyleSheet, Text, View } from "react-native";
import { CalendarClock } from "lucide-react-native";

import { ConfirmSheet, type ConfirmSheetTone } from "@/components/ui";
import { DURATION_DAYS, theme } from "@/constants";
import { formatDueAt, isoInDays } from "@/lib/utils";
import { SelectedKeysSummary } from "./SelectedKeysSummary";
import type { KeyInSet } from "@/lib/services";

type Props = {
  visible: boolean;
  title: string;
  subtitle: string;
  /** Currently selected duration, in days. */
  durationDays: number;
  /**
   * Base ISO timestamp from which the new due date is calculated.
   * Pass `undefined` to base the calculation on "now" (checkout flow);
   * pass an existing due-back timestamp to extend it further.
   */
  baseIso?: string;
  isPending: boolean;
  onDurationChange: (days: number) => void;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmTone?: ConfirmSheetTone;
  /** Optional key summary shown above the duration picker. */
  keys?: KeyInSet[];
  /**
   * When provided, only these day values are shown as chips.
   * Defaults to `DURATION_DAYS` when omitted.
   */
  allowedDays?: readonly number[];
};

/**
 * Reusable picker for "X days from now / from current due date".
 * Used by both the checkout and extend flows on the keyset detail screen.
 *
 * Renders the shared <ConfirmModal> shell (backdrop, centered card, cancel/
 * confirm action row) with the chip grid + computed due-date callout as body.
 */
export function KeySetDurationModal({
  visible,
  title,
  subtitle,
  durationDays,
  baseIso,
  isPending,
  onDurationChange,
  onCancel,
  onConfirm,
  confirmLabel,
  confirmTone = "success",
  keys = [],
  allowedDays,
}: Props) {
  const daysToShow = allowedDays ?? DURATION_DAYS;
  const newDueIso = isoInDays(
    durationDays,
    baseIso ? new Date(baseIso) : Date.now(),
  );
  const hasKeysSummary = keys.length > 0;

  return (
    <ConfirmSheet
      visible={visible}
      title={title}
      subtitle={subtitle}
      confirmLabel={isPending ? "Processing…" : confirmLabel}
      confirmTone={confirmTone}
      isPending={isPending}
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      {hasKeysSummary && (
        <View style={styles.summary}>
          <View style={styles.summaryPadded}>
            <SelectedKeysSummary keys={keys} />
          </View>
        </View>
      )}

      <View style={styles.grid}>
        {daysToShow.map((days) => {
          const selected = days === durationDays;
          return (
            <Pressable
              key={days}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.chipSelected,
                pressed && { opacity: 0.72 },
              ]}
              onPress={() => onDurationChange(days)}
              disabled={isPending}
            >
              <Text
                style={[styles.chipText, selected && styles.chipTextSelected]}
              >
                {days === 1 ? "1 day" : `${days} days`}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.dueRow}>
        <CalendarClock size={14} color={theme.colors.primary} strokeWidth={2} />
        <Text style={styles.dueText}>
          {baseIso ? "New due date:" : "Return by"}{" "}
          <Text style={styles.dueDate}>{formatDueAt(newDueIso)}</Text>
        </Text>
      </View>
    </ConfirmSheet>
  );
}

const styles = StyleSheet.create({
  summary: {
    width: "100%",
    backgroundColor: theme.colors.surfaceWarm,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  summaryPadded: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
  },
  grid: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.neutralSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipSelected: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accent,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  chipTextSelected: { color: theme.colors.accent, fontWeight: "700" },
  dueRow: {
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    gap: 6,
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
  },
  dueText: {
    flexShrink: 1,
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: "center",
  },
  dueDate: { fontWeight: "700", color: theme.colors.text },
});

import { Pressable, StyleSheet, Text, View } from "react-native";
import { CalendarClock } from "lucide-react-native";

import { ConfirmModal } from "@/components/ui";
import { DURATION_DAYS, theme } from "@/constants";
import { formatDueAt, isoInDays } from "@/lib/utils";

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
  confirmColor?: string;
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
  confirmColor = theme.colors.success,
}: Props) {
  const newDueIso = isoInDays(
    durationDays,
    baseIso ? new Date(baseIso) : Date.now(),
  );

  return (
    <ConfirmModal
      visible={visible}
      title={title}
      subtitle={subtitle}
      confirmLabel={isPending ? "Processing…" : confirmLabel}
      confirmColor={confirmColor}
      isPending={isPending}
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      <View style={styles.grid}>
        {DURATION_DAYS.map((days) => {
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
        <CalendarClock
          size={14}
          color={theme.colors.primary}
          strokeWidth={2}
        />
        <Text style={styles.dueText}>
          {baseIso ? "New due date:" : "Return by"}{" "}
          <Text style={styles.dueDate}>{formatDueAt(newDueIso)}</Text>
        </Text>
      </View>
    </ConfirmModal>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.neutralSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipSelected: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  chipTextSelected: { color: theme.colors.primary, fontWeight: "700" },
  dueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dueText: { fontSize: 13, color: theme.colors.textMuted, flex: 1 },
  dueDate: { fontWeight: "700", color: theme.colors.text },
});

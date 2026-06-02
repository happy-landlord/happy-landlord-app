import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { CalendarClock } from "lucide-react-native";

import { theme } from "@/constants";
import { formatDueAt } from "@/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;
export const DURATION_DAYS = [1, 2, 3, 5, 7] as const;

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
  const base = baseIso ? new Date(baseIso).getTime() : Date.now();
  const newDueIso = new Date(base + durationDays * DAY_MS).toISOString();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={isPending ? undefined : onCancel}
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={isPending ? undefined : onCancel}
        />
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

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
                    style={[
                      styles.chipText,
                      selected && styles.chipTextSelected,
                    ]}
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

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.btn,
                styles.btnCancel,
                pressed && { opacity: 0.72 },
              ]}
              onPress={onCancel}
              disabled={isPending}
            >
              <Text style={styles.btnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.btn,
                { backgroundColor: confirmColor },
                pressed && { opacity: 0.75 },
                isPending && { opacity: 0.55 },
              ]}
              onPress={onConfirm}
              disabled={isPending}
            >
              <Text style={styles.btnConfirmText}>
                {isPending ? "Processing…" : confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.md,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(38,38,38,0.46)",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    shadowColor: theme.colors.charcoal,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
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
  actions: { flexDirection: "row", gap: theme.spacing.sm },
  btn: {
    flex: 1,
    minHeight: 46,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  btnCancel: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  btnCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  btnConfirmText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});


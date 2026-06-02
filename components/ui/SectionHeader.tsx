import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";

import { theme } from "@/constants";

// ── Section title used above grouped content ─────────────────────────────────
// Replaces the half-dozen "uppercase muted label + optional 'View all' link"
// blocks scattered across screens.

export type SectionHeaderProps = {
  title: string;
  /** Optional inline action (e.g. "View all"). */
  actionLabel?: string;
  onAction?: () => void;
};

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={8}
        >
          <Text style={styles.actionLabel}>{actionLabel}</Text>
          <ChevronRight size={13} color={theme.colors.primary} strokeWidth={2.5} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
    paddingLeft: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingLeft: theme.spacing.sm,
  },
  actionPressed: { opacity: 0.6 },
  actionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.primary,
  },
});


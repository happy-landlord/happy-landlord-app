import { StyleSheet, Text, View } from "react-native";

import { IconBadge } from "@/components/ui";
import { theme } from "@/constants";

// ── Shared summary-card row ───────────────────────────────────────────────────
// Used by ReturnConfirmModal and TransferConfirmModal to keep their markup
// and styles DRY. Not exported from the keyset barrel — internal only.

type LucideIcon = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

export function SummaryRow({
  icon,
  label,
  value,
  valueTone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  valueTone?: "primary";
}) {
  return (
    <View style={summaryStyles.row}>
      <IconBadge icon={icon} tone="primary" size="sm" />
      <View style={summaryStyles.textBlock}>
        <Text style={summaryStyles.label}>{label}</Text>
        <Text
          style={[
            summaryStyles.value,
            valueTone === "primary" && summaryStyles.valuePrimary,
          ]}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

export const summaryStyles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: theme.colors.surfaceWarm,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  cardPadded: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
  },
  textBlock: { flex: 1, gap: 2 },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  value: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text,
  },
  valuePrimary: {
    color: theme.colors.primaryDark,
    fontWeight: "800",
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: theme.spacing.md + 30 + theme.spacing.sm,
  },
  dividerFull: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
});


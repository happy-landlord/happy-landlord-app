import { StyleSheet, Text, View } from "react-native";
import type { KeySetStatus, KeySetType } from "@/services/keys.service";
import { theme } from "@/constants/theme";

// ── Status display config ─────────────────────────────────────────────────────

type ChipConfig = { label: string; bg: string; color: string };

const STATUS_CONFIG: Record<KeySetStatus, ChipConfig> = {
  available: {
    label: "Available",
    bg: theme.colors.successSoft,
    color: theme.colors.success,
  },
  reserved: {
    label: "Reserved",
    bg: theme.colors.infoSoft,
    color: theme.colors.info,
  },
  borrowed: {
    label: "Borrowed",
    bg: theme.colors.warningSoft,
    color: theme.colors.warning,
  },
  overdue: {
    label: "Overdue",
    bg: theme.colors.dangerSoft,
    color: theme.colors.danger,
  },
  lost: {
    label: "Lost",
    bg: theme.colors.neutralSoft,
    color: theme.colors.charcoal,
  },
  tenant: {
    label: "With Tenant",
    bg: theme.colors.accentSoft,
    color: theme.colors.accentDark,
  },
  inactive: {
    label: "Inactive",
    bg: theme.colors.neutralSoft,
    color: theme.colors.textLight,
  },
};

export const SET_TYPE_LABEL: Record<KeySetType, string> = {
  company: "Company",
  tenant: "Tenant",
  unused: "Utility",
};

// ── Component ─────────────────────────────────────────────────────────────────

type KeyStatusChipProps = {
  status: KeySetStatus;
};

export function KeyStatusChip({ status }: KeyStatusChipProps) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.inactive;
  return (
    <View style={[styles.chip, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.label, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
});

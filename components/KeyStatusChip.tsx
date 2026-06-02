import { StyleSheet, Text, View } from "react-native";
import type { KeyType, KeySetStatus } from "@/types/database";
import { theme } from "@/constants/theme";

// ── Status display config ─────────────────────────────────────────────────────

type ChipConfig = { label: string; bg: string; color: string };

export type KeyChipStatus = KeySetStatus;

const STATUS_CONFIG: Record<KeyChipStatus, ChipConfig> = {
  available: {
    label: "Available",
    bg: theme.colors.successSoft,
    color: theme.colors.success,
  },
  checked_out: {
    label: "Checked Out",
    bg: theme.colors.warningSoft,
    color: theme.colors.warning,
  },
  overdue: {
    label: "Overdue",
    bg: theme.colors.dangerSoft,
    color: theme.colors.danger,
  },
  handover_tenant: {
    label: "With Tenant",
    bg: theme.colors.infoSoft,
    color: theme.colors.info,
  },
  handover_landlord: {
    label: "With Landlord",
    bg: theme.colors.neutralSoft,
    color: theme.colors.neutral,
  },
  missing_damaged: {
    label: "Lost",
    bg: theme.colors.dangerSoft,
    color: theme.colors.danger,
  },
  inactive: {
    label: "Inactive",
    bg: theme.colors.neutralSoft,
    color: theme.colors.textLight,
  },
};

export const KEY_TYPE_LABEL: Record<KeyType, string> = {
  main_door: "Main Door",
  swipe_fob: "Swipe Fob",
  mailbox: "Mailbox",
  window: "Window",
  garage_remote: "Garage Remote",
  key_card: "Key Card",
  storage_cage: "Storage Cage",
  common_area: "Common Area",
  security: "Security",
  balcony: "Balcony",
  other: "Other",
};

/** Labels for key-set `set_type` values. Falls back to raw value in callers. */
export const SET_TYPE_LABEL: Record<string, string> = {
  standard: "Standard",
  full: "Full Access",
  partial: "Partial",
  ...KEY_TYPE_LABEL,
};

// ── Component ─────────────────────────────────────────────────────────────────

type KeyStatusChipProps = {
  status: KeyChipStatus;
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

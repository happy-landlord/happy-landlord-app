import { StyleSheet, Text, View } from "react-native";
import type { KeyStatus, KeyType } from "@/services/keys.service";
import { theme } from "@/constants/theme";

// ── Status display config ─────────────────────────────────────────────────────

type ChipConfig = { label: string; bg: string; color: string };

export type KeyChipStatus = KeyStatus | "tenant";

const STATUS_CONFIG: Record<KeyChipStatus, ChipConfig> = {
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
  inactive: {
    label: "Inactive",
    bg: theme.colors.neutralSoft,
    color: theme.colors.textLight,
  },
  tenant: {
    label: "With Tenant",
    bg: theme.colors.infoSoft,
    color: theme.colors.info,
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

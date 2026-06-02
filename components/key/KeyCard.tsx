import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  Car,
  ChevronRight,
  CreditCard,
  DoorOpen,
  Home,
  KeyRound,
  Lock,
  Mail,
  PanelTop,
  Shield,
  Warehouse,
} from "lucide-react-native";

import { KEY_TYPE_LABEL } from "@/components/key/keyLabels";
import { theme } from "@/constants";
import type { KeyType } from "@/types";
import type { KeyInSet } from "@/lib/services";

// ── Icon map per key type ──────────────────────────────────────────────────────

const KEY_TYPE_ICON: Record<
  KeyType,
  React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>
> = {
  main_door: DoorOpen,
  swipe_fob: CreditCard,
  mailbox: Mail,
  window: PanelTop,
  garage_remote: Car,
  key_card: CreditCard,
  storage_cage: Warehouse,
  common_area: Lock,
  security: Shield,
  balcony: Home,
  other: KeyRound,
};

// ── Component ─────────────────────────────────────────────────────────────────

export type KeyCardProps = {
  keyItem: KeyInSet;
  onPress?: () => void;
};

export const KeyCard = memo(function KeyCard({
  keyItem,
  onPress,
}: KeyCardProps) {
  const Icon = KEY_TYPE_ICON[keyItem.key_type] ?? KeyRound;
  const typeLabel = KEY_TYPE_LABEL[keyItem.key_type] ?? keyItem.key_type;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={keyItem.label}
    >
      <View style={styles.iconWrap}>
        <Icon size={18} color={theme.colors.primary} strokeWidth={1.8} />
      </View>

      <View style={styles.info}>
        <Text style={styles.label} numberOfLines={1}>
          {keyItem.label}
        </Text>
        <Text style={styles.code}>{keyItem.code}</Text>
        <Text style={styles.typeText}>{typeLabel}</Text>
      </View>

      <View style={styles.right}>
        <ChevronRight
          size={16}
          color={theme.colors.textLight}
          strokeWidth={1.8}
        />
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  cardPressed: {
    opacity: 0.7,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text,
  },
  code: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.colors.textMuted,
  },
  typeText: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.colors.textLight,
    marginTop: 1,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
});

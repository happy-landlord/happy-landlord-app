import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight, KeyRound } from "lucide-react-native";

import { KeyStatusChip, SET_TYPE_LABEL } from "@/components/KeyStatusChip";
import { theme } from "@/constants/theme";
import type { KeySet } from "@/services/keys.service";

export type KeySetCardProps = {
  keySet: KeySet;
  onPress?: () => void;
};

export const KeySetCard = memo(function KeySetCard({ keySet, onPress }: KeySetCardProps) {
  const totalKeys = (keySet.inventory?.items ?? []).reduce(
    (sum, item) => sum + (item.quantity ?? 0),
    0,
  );
  const typeLabel = `${SET_TYPE_LABEL[keySet.set_type] ?? keySet.set_type} Keyset`;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={typeLabel}
    >
      <View style={styles.iconWrap}>
        <KeyRound size={18} color={theme.colors.primary} strokeWidth={1.8} />
      </View>

      <View style={styles.info}>
        <Text style={styles.typeLabel}>{typeLabel}</Text>
        <Text style={styles.code}>{keySet.set_code}</Text>
        <Text style={styles.keyCount}>
          {totalKeys} {totalKeys === 1 ? "Key" : "Keys"}
        </Text>
      </View>

      <View style={styles.right}>
        <KeyStatusChip status={keySet.status} />
        <ChevronRight size={16} color={theme.colors.textLight} strokeWidth={1.8} />
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
  typeLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text,
  },
  code: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.colors.textMuted,
  },
  keyCount: {
    fontSize: 12,
    color: theme.colors.textLight,
    fontWeight: "500",
    marginTop: 1,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
});

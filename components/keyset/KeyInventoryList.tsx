import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";
import type { KeyInventoryItem } from "@/services/keys.service";

import { FALLBACK_ITEM_ICON, ITEM_TYPE_ICON, ITEM_TYPE_LABEL } from "./keysetLabels";

export type KeyInventoryListProps = {
  items: KeyInventoryItem[];
};

export const KeyInventoryList = memo(function KeyInventoryList({ items }: KeyInventoryListProps) {
  if (items.length === 0) {
    return <Text style={styles.empty}>No inventory recorded.</Text>;
  }

  return (
    <View style={styles.list}>
      {items.map((item, index) => {
        const label = ITEM_TYPE_LABEL[item.type] ?? item.type;
        const Icon = ITEM_TYPE_ICON[item.type] ?? FALLBACK_ITEM_ICON;
        return (
          <View key={`${item.type}-${item.code ?? ""}-${index}`} style={styles.chip}>
            <View style={styles.iconCircle}>
              <Icon size={13} color={theme.colors.primary} strokeWidth={1.8} />
            </View>
            <View style={styles.textBlock}>
              <Text style={styles.label} numberOfLines={1}>{label}</Text>
              {item.code ? (
                <View style={styles.codeChip}>
                  <Text style={styles.codeText}>{item.code}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.quantity}>x{item.quantity}</Text>
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  list: {
    gap: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text,
  },
  codeChip: {
    backgroundColor: theme.colors.surfaceWarm,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  codeText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
  },
  quantity: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  empty: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontStyle: "italic",
  },
});


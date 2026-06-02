import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";
import type { DbProperty } from "@/types/database";
import type { KeyInSet } from "@/lib/services/keySets.service";

export type PropertySummaryProps = {
  property: DbProperty;
  keys: KeyInSet[] | undefined;
};

export const PropertySummary = memo(function PropertySummary({
  property: _property,
  keys,
}: PropertySummaryProps) {
  const total = keys?.reduce((s, k) => s + k.quantity, 0) ?? 0;

  return (
    <View style={styles.row}>
      <StatCell value={total} label="Keys" />
    </View>
  );
});

function StatCell({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 6,
  },
  cell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 78,
    paddingVertical: 13,
    backgroundColor: "#FFFEFB",
    borderWidth: 1,
    borderColor: "#EEE8DD",
    borderRadius: theme.radius.xl,
    gap: 6,
  },
  value: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.text,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
});

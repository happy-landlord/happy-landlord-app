import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";
import type { Property } from "@/services/properties.service";
import type { KeySetWithHolder } from "@/services/keys.service";

export type PropertySummaryProps = {
  property: Property;
  keySets: KeySetWithHolder[] | undefined;
};

export const PropertySummary = memo(function PropertySummary({
  property,
  keySets,
}: PropertySummaryProps) {
  const keysetCount = keySets?.length ?? 0;
  const keyCount =
    keySets?.reduce(
      (sum, ks) =>
        sum +
        (ks.inventory?.items ?? []).reduce(
          (itemSum, item) => itemSum + (item.quantity ?? 0),
          0,
        ),
      0,
    ) ?? 0;
  const landlordCount = property.landlord_name ? 1 : 0;

  return (
    <View style={styles.row}>
      <StatCell value={keysetCount} label="Keysets" />
      <StatCell value={keyCount} label="Keys" />
      <StatCell value={landlordCount} label="Landlord" />
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

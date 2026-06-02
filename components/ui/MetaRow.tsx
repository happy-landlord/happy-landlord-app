import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants";
import { PhoneLink } from "./PhoneLink";

// ── MetaRow ───────────────────────────────────────────────────────────────────
// Generic "divider + label/value columns" block extracted from PropertyHeader,
// KeySetsSection, and the keyset detail screen. Each item becomes its own
// equal-width column.

export type MetaItem = {
  label: string;
  value: string;
  danger?: boolean;
  /** When true the value is rendered as a tappable phone link. */
  phone?: boolean;
};

export type MetaRowProps = {
  items: MetaItem[];
  /** Show a 1px divider above the row. Defaults to true. */
  divider?: boolean;
};

export function MetaRow({ items, divider = true }: MetaRowProps) {
  if (items.length === 0) return null;
  return (
    <View>
      {divider ? <View style={styles.divider} /> : null}
      <View style={styles.content}>
        {items.map((item) => (
          <View key={item.label} style={styles.item}>
            <Text style={styles.label}>{item.label}</Text>
            {item.phone ? (
              <PhoneLink
                phone={item.value}
                textStyle={[styles.value, item.danger && styles.valueDanger]}
              />
            ) : (
              <Text
                style={[styles.value, item.danger && styles.valueDanger]}
                numberOfLines={1}
              >
                {item.value}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  content: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
  },
  item: { flex: 1, gap: 2, minWidth: 0 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  value: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
  },
  valueDanger: {
    color: theme.colors.danger,
  },
});


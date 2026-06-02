import { StyleSheet, Text, View } from "react-native";
import { KeyRound } from "lucide-react-native";

import { KEY_TYPE_ICON, KEY_TYPE_LABEL, theme } from "@/constants";
import type { KeySetWithDetails } from "@/lib/services";

// ── KeySetKeysList ───────────────────────────────────────────────────────────
// Bordered list of the keys inside a keyset, one row per key. Used on the
// keyset detail screen.

type KeyInSet = NonNullable<KeySetWithDetails["keys"]>[number];

export type KeySetKeysListProps = {
  keys: KeyInSet[];
};

export function KeySetKeysList({ keys }: KeySetKeysListProps) {
  if (keys.length === 0) return null;

  return (
    <View style={styles.list}>
      {keys.map((k) => {
        const Icon = KEY_TYPE_ICON[k.key_type] ?? KeyRound;
        const label =
          k.key_type === "other"
            ? k.label
            : (KEY_TYPE_LABEL[k.key_type] ?? k.key_type);
        return (
          <View key={k.id} style={styles.row}>
            <View style={styles.iconCircle}>
              <Icon size={15} color={theme.colors.primary} strokeWidth={1.8} />
            </View>
            <View style={styles.info}>
              <Text style={styles.label}>{label}</Text>
              {k.code ? <Text style={styles.code}>{k.code}</Text> : null}
            </View>
            {k.quantity > 1 && (
              <View style={styles.qtyBadge}>
                <Text style={styles.qtyBadgeText}>×{k.quantity}</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  info: { flex: 1, gap: 2 },
  label: { fontSize: 14, fontWeight: "700", color: theme.colors.text },
  code: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: "500",
  },
  qtyBadge: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: theme.colors.primarySoft,
  },
  qtyBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.primaryDark,
  },
});


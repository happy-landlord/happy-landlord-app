import { StyleSheet, Text, View } from "react-native";
import { KeyRound } from "lucide-react-native";

import { useKeySetScreen } from "./KeySetScreenContext";
import { KEY_TYPE_ICON, theme } from "@/constants";
import { useKeySet } from "@/lib/hooks";
import { getKeyName } from "@/lib/utils";

// ── KeySetKeysList ───────────────────────────────────────────────────────────
// List of the keys inside a keyset, one row per key. Reads its keyset from
// context + TanStack — no props. Rendered embedded inside KeySetDetailsCard.

export function KeySetKeysList() {
  const { keySetId } = useKeySetScreen();
  const { data: keySet } = useKeySet(keySetId);
  const keys = keySet?.keys ?? [];

  if (keys.length === 0) return null;

  return (
    <>
      {keys.map((k) => {
        const Icon = KEY_TYPE_ICON[k.key_type] ?? KeyRound;
        const label = getKeyName(k);
        return (
          <View key={k.id} style={styles.row}>
            <View style={styles.iconCircle}>
              <Icon size={15} color={theme.colors.accent} strokeWidth={1.8} />
            </View>
            <Text style={styles.label} numberOfLines={1}>
              {label}
            </Text>
            {k.code ? (
              <View style={styles.codeBadge}>
                <Text style={styles.codeText}>{k.code}</Text>
              </View>
            ) : null}
            {k.quantity > 1 && (
              <View style={styles.qtyBadge}>
                <Text style={styles.qtyBadgeText}>×{k.quantity}</Text>
              </View>
            )}
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    flexShrink: 1,
  },
  codeBadge: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: theme.colors.neutralSoft,
  },
  codeText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  qtyBadge: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: theme.colors.accentSoft,
  },
  qtyBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.accent,
  },
});

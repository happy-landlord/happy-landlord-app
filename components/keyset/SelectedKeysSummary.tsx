import { StyleSheet, Text, View } from "react-native";
import { KeyRound } from "lucide-react-native";

import { IconBadge } from "@/components/ui/IconBadge";
import { KEY_TYPE_ICON, theme } from "@/constants";
import { getKeyName } from "@/lib/utils";
import type { KeyInSet } from "@/lib/services";

// ── SelectedKeysSummary ───────────────────────────────────────────────────────
// Shared key-list summary used by the checkout / return / transfer confirm
// modals. Each row shows a typed icon, the key label, an optional code badge,
// and a quantity tag.
//
// Two variants exist in the original code:
//  - `compact` (Checkout) — flat list, no code/qty badges
//  - `full`    (Return / Transfer) — bordered row with code + qty
//
// Pick via the `variant` prop. Defaults to `full`.

export type SelectedKeysSummaryProps = {
  keys: KeyInSet[];
  variant?: "compact" | "full";
  /** Optional override of the section heading. */
  heading?: string;
};

export function SelectedKeysSummary({
  keys,
  variant = "full",
  heading = "Keys",
}: SelectedKeysSummaryProps) {
  if (keys.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>{heading}</Text>
        {variant === "compact" ? (
          <Text style={styles.headingCount}>{keys.length}</Text>
        ) : null}
      </View>

      <View style={variant === "compact" ? styles.listCompact : styles.list}>
        {keys.map((k) => {
          const Icon = KEY_TYPE_ICON[k.key_type] ?? KeyRound;
          const label = getKeyName(k);
          if (variant === "compact") {
            return (
              <View key={k.id} style={styles.rowCompact}>
                <IconBadge
                  icon={Icon}
                  size="sm"
                  tone="primary"
                  background={theme.colors.surface}
                />
                <Text style={styles.labelCompact} numberOfLines={1}>
                  {label}
                </Text>
              </View>
            );
          }
          return (
            <View key={k.id} style={styles.row}>
              <View style={styles.iconCircle}>
                <Icon size={12} color={theme.colors.primaryDark} strokeWidth={1.8} />
              </View>
              <Text style={styles.label} numberOfLines={1}>
                {label}
              </Text>
              {k.code ? (
                <View style={styles.codeBadge}>
                  <Text style={styles.codeText} numberOfLines={1}>
                    {k.code}
                  </Text>
                </View>
              ) : null}
              <Text style={styles.qtyText}>x{k.quantity}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  section: { gap: 7 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heading: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  headingCount: {
    minWidth: 24,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    overflow: "hidden",
    backgroundColor: theme.colors.primarySoft,
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  list: { gap: 7 },
  listCompact: { gap: 4 },

  // -- full variant ---------------------------------------------------------
  row: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  label: {
    flexShrink: 1,
    maxWidth: 110,
    fontSize: 13,
    fontWeight: "800",
    color: theme.colors.text,
  },
  codeBadge: {
    maxWidth: 110,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: theme.colors.surfaceWarm,
  },
  codeText: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.text,
    letterSpacing: 0.2,
  },
  qtyText: {
    marginLeft: "auto",
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.primaryDark,
  },

  // -- compact variant ------------------------------------------------------
  rowCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: 6,
  },
  labelCompact: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
});


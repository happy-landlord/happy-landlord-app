import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants";

export type TabDef<K extends string> = {
  key: K;
  label: string;
  /** Numeric badge. Hidden when 0 unless `alwaysShowBadge` is true. */
  badgeCount?: number;
  badgeVariant?: "primary" | "danger";
  alwaysShowBadge?: boolean;
};

type Props<K extends string> = {
  tabs: TabDef<K>[];
  activeKey: K;
  onChange: (key: K) => void;
};

/**
 * Generic, data-driven tab bar with pill-button style.
 * Caller owns selection state; badge data is passed via `tabs`.
 */
export function TabBar<K extends string>({
  tabs,
  activeKey,
  onChange,
}: Props<K>) {
  return (
    <View style={styles.strip}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        const showBadge = tab.alwaysShowBadge || (tab.badgeCount ?? 0) > 0;
        const danger = tab.badgeVariant === "danger";

        return (
          <Pressable
            key={tab.key}
            style={[styles.btn, isActive && styles.btnActive]}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
            {showBadge && (
              <View
                style={[
                  styles.badge,
                  danger
                    ? styles.badgeDanger
                    : isActive
                      ? styles.badgeActive
                      : styles.badgeDefault,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    danger ? styles.badgeTextDanger : styles.badgeTextDefault,
                  ]}
                >
                  {formatBadge(tab.badgeCount ?? 0)}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function formatBadge(count: number) {
  return count > 99 ? "99+" : count;
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 6,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  btnActive: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accent,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  labelActive: {
    color: theme.colors.accent,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeDefault: { backgroundColor: theme.colors.neutralSoft },
  badgeActive: { backgroundColor: theme.colors.border },
  badgeDanger: { backgroundColor: theme.colors.danger },
  badgeText: { fontSize: 10, fontWeight: "700" },
  badgeTextDefault: { color: theme.colors.textMuted },
  badgeTextDanger: { color: theme.colors.surface },
});

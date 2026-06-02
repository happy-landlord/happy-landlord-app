import { useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

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
 * Generic, data-driven tab bar with an animated underline indicator.
 * Caller owns selection state; badge data is passed via `tabs`.
 */
export function TabBar<K extends string>({ tabs, activeKey, onChange }: Props<K>) {
  const { width: screenWidth } = useWindowDimensions();
  const indicatorAnim = useRef(new Animated.Value(0)).current;

  const tabBarWidth = Math.max(0, screenWidth - theme.spacing.screen * 2);
  const tabWidth = tabs.length > 0 ? tabBarWidth / tabs.length : 0;


  const handlePress = (key: K, index: number) => {
    Animated.spring(indicatorAnim, {
      toValue: index,
      useNativeDriver: false,
      tension: 80,
      friction: 10,
    }).start();
    onChange(key);
  };

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab, index) => {
        const isActive = tab.key === activeKey;
        const showBadge =
          tab.alwaysShowBadge || (tab.badgeCount ?? 0) > 0;
        const danger = tab.badgeVariant === "danger";

        return (
          <Pressable
            key={tab.key}
            style={styles.tabItem}
            onPress={() => handlePress(tab.key, index)}
          >
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.label}
            </Text>
            {showBadge && (
              <View
                style={[
                  styles.tabBadge,
                  danger ? styles.tabBadgeDanger : styles.tabBadgePrimary,
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    danger
                      ? styles.tabBadgeTextDanger
                      : styles.tabBadgeTextPrimary,
                  ]}
                >
                  {formatBadge(tab.badgeCount ?? 0)}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}

      <Animated.View
        style={[
          styles.tabIndicator,
          {
            width: tabWidth,
            transform: [
              {
                translateX: indicatorAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, tabWidth],
                }),
              },
            ],
          },
        ]}
      />
    </View>
  );
}

function formatBadge(count: number) {
  return count > 99 ? "99+" : count;
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    marginHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    position: "relative",
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: theme.spacing.sm,
    gap: 6,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textLight,
    letterSpacing: 0.3,
  },
  tabLabelActive: { color: theme.colors.primary },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  tabBadgePrimary: { backgroundColor: theme.colors.primarySoft },
  tabBadgeDanger: { backgroundColor: theme.colors.danger },
  tabBadgeText: { fontSize: 10, fontWeight: "700" },
  tabBadgeTextPrimary: { color: theme.colors.primary },
  tabBadgeTextDanger: { color: theme.colors.surface },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    height: 2,
    backgroundColor: theme.colors.primary,
    borderRadius: 1,
  },
});


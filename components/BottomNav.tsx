import type React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePathname, useRouter } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import {
  Home,
  KeyRound,
  ScanLine,
  History,
  User,
  Activity,
} from "lucide-react-native";

import { theme } from "@/constants";
import { useRole } from "@/hooks";

type TabConfig = {
  name: string;
  label: string;
  Icon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
};

const ADMIN_TABS_LEFT: TabConfig[] = [
  { name: "index", label: "Home", Icon: Home },
  { name: "properties", label: "Properties", Icon: KeyRound },
];

const ADMIN_TABS_RIGHT: TabConfig[] = [
  { name: "activity", label: "Activity", Icon: Activity },
  { name: "history", label: "History", Icon: History },
];

const AGENT_TABS_LEFT: TabConfig[] = [
  { name: "index", label: "Home", Icon: Home },
  { name: "properties", label: "Properties", Icon: KeyRound },
];

const AGENT_TABS_RIGHT: TabConfig[] = [
  { name: "activity", label: "Activity", Icon: Activity },
  { name: "profile", label: "Profile", Icon: User },
];

export function BottomNav({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const bottomOffset = insets.bottom + theme.spacing.sm;
  const { isAdmin } = useRole();

  const tabsLeft = isAdmin ? ADMIN_TABS_LEFT : AGENT_TABS_LEFT;
  const tabsRight = isAdmin ? ADMIN_TABS_RIGHT : AGENT_TABS_RIGHT;

  // Map tab names to their route index so focus detection still works
  const tabIndexMap = Object.fromEntries(
    state.routes.map((r, i) => [r.name, i]),
  );

  const renderTab = (tab: TabConfig) => {
    const routeIndex = tabIndexMap[tab.name] ?? -1;
    const isFocused = state.index === routeIndex;
    const { Icon } = tab;
    const color = isFocused ? theme.colors.primary : theme.colors.accentSoft;

    const onPress = () => {
      const event = navigation.emit({
        type: "tabPress",
        target: state.routes[routeIndex]?.key,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(state.routes[routeIndex]?.name ?? tab.name);
      }
    };

    return (
      <Pressable
        key={tab.name}
        onPress={onPress}
        style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
        accessibilityRole="button"
        accessibilityLabel={tab.label}
      >
        <Icon size={22} color={color} strokeWidth={isFocused ? 2.2 : 1.8} />
        <Text style={[styles.label, { color }]}>{tab.label}</Text>
      </Pressable>
    );
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom: bottomOffset }]}
    >
      <View style={styles.shadowShell}>
        <View style={styles.bar}>
          {/* Left tabs */}
          {tabsLeft.map(renderTab)}

          {/* Centre scan button — pushes a Stack screen so back() returns here */}
          <View style={styles.scanWrapper}>
            <Pressable
              onPress={() => {
                router.push({
                  pathname: "/(app)/scan",
                  params: { returnTo: pathname },
                } as never);
              }}
              style={({ pressed }) => [
                styles.scanBtn,
                pressed && styles.scanBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Scan"
            >
              <ScanLine
                size={30}
                color={theme.colors.accent}
                strokeWidth={2.2}
              />
            </Pressable>
          </View>

          {/* Right tabs */}
          {tabsRight.map(renderTab)}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 20,
    backgroundColor: "transparent",
    paddingHorizontal: theme.spacing.screen,
    overflow: "visible",
  },
  shadowShell: {
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.accentLight,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.34,
    shadowRadius: 28,
    elevation: 24,
    overflow: "visible",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.accentLight,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    marginBottom: 0,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.xs,
    gap: 3,
  },
  tabPressed: {
    opacity: 0.6,
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
  },
  // Scan button — raised circle in the centre
  scanWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: theme.spacing.sm,
    // lift the button above the bar
    marginTop: -34,
  },
  scanBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.48,
    shadowRadius: 8,
    elevation: 8,
  },
  scanBtnPressed: {
    opacity: 0.8,
  },
});

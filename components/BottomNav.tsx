import { Pressable, StyleSheet, Text, View } from "react-native";
import type React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePathname, useRouter } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Home, KeyRound, ScanLine, History, User } from "lucide-react-native";

import { theme } from "@/constants/theme";

const TAB_CONFIG: {
  name: string;
  label: string;
  Icon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
}[] = [
  { name: "index", label: "Home", Icon: Home },
  { name: "properties", label: "Keys", Icon: KeyRound },
  { name: "activity", label: "Activity", Icon: History },
  { name: "profile", label: "Profile", Icon: User },
];

export function BottomNav({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const bottomOffset = insets.bottom + theme.spacing.sm;

  // Map tab names to their route index so focus detection still works
  const tabIndexMap = Object.fromEntries(
    state.routes.map((r, i) => [r.name, i]),
  );

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom: bottomOffset }]}
    >
      <View style={styles.shadowShell}>
        <View style={styles.bar}>
          {/* First two tabs */}
          {TAB_CONFIG.slice(0, 2).map((tab) => {
            const routeIndex = tabIndexMap[tab.name] ?? -1;
            const isFocused = state.index === routeIndex;
            const { Icon } = tab;
            const color = isFocused
              ? theme.colors.primary
              : theme.colors.textMuted;

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
                style={({ pressed }) => [
                  styles.tab,
                  pressed && styles.tabPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={tab.label}
              >
                <Icon
                  size={22}
                  color={color}
                  strokeWidth={isFocused ? 2.2 : 1.8}
                />
                <Text style={[styles.label, { color }]}>{tab.label}</Text>
              </Pressable>
            );
          })}

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
              <ScanLine size={30} color="#fff" strokeWidth={2.2} />
            </Pressable>
          </View>

          {/* Last two tabs */}
          {TAB_CONFIG.slice(2).map((tab) => {
            const routeIndex = tabIndexMap[tab.name] ?? -1;
            const isFocused = state.index === routeIndex;
            const { Icon } = tab;
            const color = isFocused
              ? theme.colors.primary
              : theme.colors.textMuted;

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
                style={({ pressed }) => [
                  styles.tab,
                  pressed && styles.tabPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={tab.label}
              >
                <Icon
                  size={22}
                  color={color}
                  strokeWidth={isFocused ? 2.2 : 1.8}
                />
                <Text style={[styles.label, { color }]}>{tab.label}</Text>
              </Pressable>
            );
          })}
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
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.charcoal,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.34,
    shadowRadius: 28,
    elevation: 24,
    overflow: "visible",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
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
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.42,
    shadowRadius: 16,
    elevation: 16,
  },
  scanBtnPressed: {
    opacity: 0.8,
  },
});

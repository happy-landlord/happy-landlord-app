import { Pressable, StyleSheet, Text, View } from "react-native";
import type React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePathname, useRouter } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import {
  Home,
  KeyRound,
  ScanLine,
  History,
  User,
} from "lucide-react-native";

import { theme } from "@/constants/theme";

const TAB_CONFIG: {
  name: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
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

  // Map tab names to their route index so focus detection still works
  const tabIndexMap = Object.fromEntries(
    state.routes.map((r, i) => [r.name, i])
  );

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom }]}>

      <View style={styles.bar}>
        {/* First two tabs */}
        {TAB_CONFIG.slice(0, 2).map((tab) => {
          const routeIndex = tabIndexMap[tab.name] ?? -1;
          const isFocused = state.index === routeIndex;
          const { Icon } = tab;
          const color = isFocused ? theme.colors.primary : theme.colors.textMuted;

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
            style={({ pressed }) => [styles.scanBtn, pressed && styles.scanBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Scan"
          >
            <ScanLine size={26} color="#fff" strokeWidth={2} />
          </Pressable>
        </View>

        {/* Last two tabs */}
        {TAB_CONFIG.slice(2).map((tab) => {
          const routeIndex = tabIndexMap[tab.name] ?? -1;
          const isFocused = state.index === routeIndex;
          const { Icon } = tab;
          const color = isFocused ? theme.colors.primary : theme.colors.textMuted;

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
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingTop: 0,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    shadowColor: theme.colors.charcoal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: theme.spacing.sm,
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
    // lift the button above the bar
    marginTop: -28,
  },
  scanBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  scanBtnPressed: {
    opacity: 0.8,
  },
});

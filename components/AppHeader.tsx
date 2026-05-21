import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Menu, ChevronLeft } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useNavigationState } from "@react-navigation/native";

import { Logo } from "@/components/ui/Logo";
import { MenuSheet } from "@/components/MenuSheet";
import { NotificationBell } from "@/components/NotificationBell";
import { theme } from "@/constants/theme";

export function AppHeader() {
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const stackIndex = useNavigationState((state) => state?.index ?? 0);
  const canGoBack = stackIndex > 0;

  return (
    <>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.inner}>
          {/* Left — back button on detail screens, logo on root screens */}
          {canGoBack ? (
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ChevronLeft size={22} color={theme.colors.text} strokeWidth={2} />
            </Pressable>
          ) : (
            <View style={styles.logoWrap}>
              <Logo size={36} />
            </View>
          )}

          <View style={styles.actions}>
            <NotificationBell />

            {/* Right — hamburger menu */}
            <Pressable
              onPress={() => setMenuOpen(true)}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Open menu"
            >
              <Menu size={22} color={theme.colors.text} strokeWidth={1.8} />
            </Pressable>
          </View>
        </View>
      </View>

      <MenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.screen,
    paddingVertical: theme.spacing.sm,
  },
  logoWrap: {
    borderRadius: theme.radius.sm,
    overflow: "hidden",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  iconBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.neutralSoft,
  },
  iconBtnPressed: {
    opacity: 0.65,
  },
});

import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Menu } from "lucide-react-native";

import { Logo } from "@/components/ui/Logo";
import { MenuSheet } from "@/components/MenuSheet";
import { theme } from "@/constants/theme";

export function AppHeader() {
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.inner}>
          {/* Logo — left */}
          <View style={styles.logoWrap}>
            <Logo size={36} />
          </View>

          {/* Hamburger — right */}
          <Pressable
            onPress={() => setMenuOpen(true)}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
            hitSlop={8}
          >
            <Menu size={22} color={theme.colors.text} strokeWidth={1.8} />
          </Pressable>
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

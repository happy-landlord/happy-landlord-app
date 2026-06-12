import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants";
import { Logo } from "./Logo";

type Props = {
  /** Optional caption shown below the spinner. */
  message?: string;
  /** Logo size. Defaults to 56 to match the auth screens. */
  logoSize?: number;
};

/**
 * Full-screen branded loading splash — Happy Landlord logo, themed spinner
 * and an optional caption. Used by auth callbacks and other "blocking" waits
 * where the app has no other UI to show yet.
 *
 * Centralised here so every blocking spinner across the app shares the same
 * brand treatment and theme tokens.
 */
export function BrandedSplash({
  message = "Just a moment…",
  logoSize = 56,
}: Props) {
  return (
    <View style={styles.screen} accessibilityLiveRegion="polite">
      <View style={styles.logoHalo}>
        <View style={styles.logoWrap}>
          <Logo size={logoSize} />
        </View>
      </View>
      <View style={styles.spinnerWrap}>
        <ActivityIndicator
          color={theme.colors.accent}
          size="large"
          style={styles.spinner}
        />
      </View>
      {message ? <Text style={styles.label}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.md,
  },
  logoHalo: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1,
    borderColor: theme.colors.accentLight,
  },
  logoWrap: {
    borderRadius: theme.radius.lg,
    overflow: "hidden",
  },
  spinnerWrap: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.sm,
  },
  spinner: {
    transform: [{ scale: 0.95 }],
  },
  label: {
    fontSize: 15,
    color: theme.colors.textMuted,
    fontWeight: "500",
  },
});


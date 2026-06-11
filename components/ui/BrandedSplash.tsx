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
      <View style={styles.logoWrap}>
        <Logo size={logoSize} />
      </View>
      <ActivityIndicator
        color={theme.colors.primary}
        size="large"
        style={styles.spinner}
      />
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
    gap: theme.spacing.lg,
  },
  logoWrap: {
    borderRadius: theme.radius.lg,
    overflow: "hidden",
  },
  spinner: {
    marginTop: theme.spacing.sm,
  },
  label: {
    fontSize: 15,
    color: theme.colors.textMuted,
    fontWeight: "500",
  },
});


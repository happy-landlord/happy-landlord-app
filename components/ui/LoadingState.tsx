import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";

type LoadingStateProps = {
  message?: string;
};

export function LoadingState({ message = "Loading..." }: LoadingStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.spinnerWrap}>
          <ActivityIndicator color={theme.colors.primary} size="small" />
        </View>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.skeletonStack}>
          <View style={[styles.skeletonLine, styles.skeletonLineLong]} />
          <View style={[styles.skeletonLine, styles.skeletonLineMedium]} />
          <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 280,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceWarm,
    padding: theme.spacing.lg,
  },
  spinnerWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primarySoft,
    marginBottom: theme.spacing.md,
  },
  message: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.textMuted,
    textAlign: "center",
  },
  skeletonStack: {
    width: "100%",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  skeletonLine: {
    height: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.neutralSoft,
  },
  skeletonLineLong: {
    width: "78%",
  },
  skeletonLineMedium: {
    width: "58%",
  },
  skeletonLineShort: {
    width: "38%",
  },
});


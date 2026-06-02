import { AlertTriangle } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "./Button";
import { theme } from "@/constants";

type ErrorStateProps = {
  title?: string;
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = "Something went wrong",
  message = "Please try again.",
  retryLabel = "Try again",
  onRetry,
}: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <AlertTriangle size={28} color={theme.colors.danger} strokeWidth={1.8} />
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>

        {onRetry ? (
          <View style={styles.actionWrap}>
            <Button title={retryLabel} variant="outline" onPress={onRetry} />
          </View>
        ) : null}
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
    maxWidth: 340,
    alignItems: "center",
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.danger + "30",
    backgroundColor: theme.colors.surfaceWarm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },
  message: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 21,
  },
  actionWrap: {
    marginTop: theme.spacing.lg,
  },
});


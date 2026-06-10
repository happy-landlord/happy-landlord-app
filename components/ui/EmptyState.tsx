import type { ComponentType } from "react";
import { Inbox } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "./Button";
import { theme } from "@/constants";

type EmptyStateProps = {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  Icon?: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
};

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  Icon = Inbox,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconOuter}>
          <View style={styles.iconInner}>
            <Icon size={30} color={theme.colors.primary} strokeWidth={1.7} />
          </View>
        </View>

        <Text style={styles.title}>{title}</Text>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        {actionLabel && onAction ? (
          <View style={styles.actionWrap}>
            <Button title={actionLabel} variant="primary" onPress={onAction} />
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
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceWarm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 2,
  },
  iconOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.lg,
  },
  iconInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
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

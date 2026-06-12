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
        <View style={styles.iconWrap}>
          <Icon size={28} color={theme.colors.accent} strokeWidth={1.8} />
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
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.accent,
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

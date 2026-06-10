import { StyleSheet } from "react-native";

import { theme } from "@/constants";

/**
 * Shared layout/state styles used by both Agents and Requests lists.
 * Each list keeps its own card-specific styles colocated with the component.
 */
export const sharedStyles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.screen,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 16,
    marginBottom: theme.spacing.md,
  },
  retryBtn: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.pill,
  },
  retryLabel: { color: theme.colors.accent, fontWeight: "600" },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: theme.colors.neutralSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptyMessage: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
  list: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  separator: { height: theme.spacing.sm },
});

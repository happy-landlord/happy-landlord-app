import { StyleSheet } from "react-native";

import { theme } from "@/constants";

/**
 * Shared layout/state styles used by both Agents and Requests lists.
 * Each list keeps its own card-specific styles colocated with the component.
 * Loading / error / empty (page-level) states are delegated to the shared
 * LoadingState / ErrorState / EmptyState UI components.
 */
export const sharedStyles = StyleSheet.create({
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
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.md,
  },
  separator: { height: theme.spacing.sm },
});

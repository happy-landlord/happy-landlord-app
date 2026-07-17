import type { ReactNode } from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { theme } from "@/constants";

export interface FormSectionProps {
  /** Uppercase group title shown above the content. */
  title?: string;
  /** Optional element aligned to the right of the title (e.g. a button/count). */
  action?: ReactNode;
  /** Wrap children in a bordered surface card (default `true`). */
  card?: boolean;
  /** Extra style applied to the card body. */
  cardStyle?: StyleProp<ViewStyle>;
  /** Extra style applied to the outer group. */
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/**
 * Standard titled form section used across the add/edit property & keyset
 * forms: an uppercase title row plus a bordered surface card body. Centralises
 * the previously-duplicated `sectionGroup / sectionGroupTitle / sectionCard`
 * markup so every form looks the same.
 */
export function FormSection({
  title,
  action,
  card = true,
  cardStyle,
  style,
  children,
}: FormSectionProps) {
  return (
    <View style={[styles.group, style]}>
      {title || action ? (
        <View style={styles.header}>
          {title ? <Text style={styles.title}>{title}</Text> : <View />}
          {action}
        </View>
      ) : null}
      {card ? <View style={[styles.card, cardStyle]}>{children}</View> : children}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: theme.spacing.sm },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.xs,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingTop: 6,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.sm,
    overflow: "visible",
  },
});


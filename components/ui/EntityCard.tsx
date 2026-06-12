import type { ComponentType, ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

import { theme } from "@/constants";
import { Card, PressableCard, type PressableCardPressEffect } from "./Card";
import { IconBadge, type IconBadgeSize, type IconBadgeTone } from "./IconBadge";

// ── EntityCard ───────────────────────────────────────────────────────────────
// Common chrome for "entity" cards across the app (properties, keysets,
// attention rows, etc.). Standardises:
//   • leading IconBadge
//   • body with optional eyebrow / title / subtitle
//   • trailing pills row (status + count + type chips)
//   • optional `right` slot (chevron, edit button, …)
//   • optional `meta` block rendered below an auto divider
//   • optional `footer` block rendered below `meta` with no divider
//
// Picks `Card` or `PressableCard` based on whether `onPress` is supplied —
// either way the surface, border, radius and pressed-feedback come from the
// shared `Card` primitive so all entity cards stay visually in lock-step.

type LucideLike = ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

/** Convenience prop type — accepts a plain string or any custom ReactNode. */
export type EntityCardSlot = string | ReactNode;

/** Renders a string/number through `<Text style={style}>`, or returns the
 *  node untouched when the caller passes a custom React element. */
function renderTextOrNode(
  node: EntityCardSlot | null | undefined,
  style: StyleProp<TextStyle>,
  numberOfLines = 1,
): ReactNode {
  if (node == null) return null;
  const kind = typeof node;
  if (kind === "string" || kind === "number") {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {node}
      </Text>
    );
  }
  return node;
}

export type EntityCardProps = {
  /** Lucide icon component rendered inside an `IconBadge`. */
  icon?: LucideLike;
  iconTone?: IconBadgeTone;
  iconSize?: IconBadgeSize;
  /** Full custom replacement for the leading slot (e.g. an Image). */
  leading?: ReactNode;

  /** Small uppercase muted line above the title (suburb, code, …). */
  eyebrow?: EntityCardSlot;
  /** Main heading text or node. */
  title: EntityCardSlot;
  /** Optional muted line directly below the title. */
  subtitle?: EntityCardSlot;

  /** Pill chips (status, count, type). Placed next to `eyebrow` when present,
   *  otherwise inline with the title (right-aligned). */
  pills?: ReactNode;

  /** Trailing slot — chevron, edit button, custom CTA. */
  right?: ReactNode;

  /** Block rendered below the top row, preceded by an auto divider. */
  meta?: ReactNode;
  /** Block rendered below `meta` with no divider (e.g. footer action). */
  footer?: ReactNode;

  /** When set, renders a `PressableCard` and forwards the handler. */
  onPress?: () => void;
  /** Optional visual feedback mode used while pressing interactive cards. */
  pressEffect?: PressableCardPressEffect;

  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function EntityCard({
  icon,
  iconTone = "neutral",
  iconSize = "md",
  leading,
  eyebrow,
  title,
  subtitle,
  pills,
  right,
  meta,
  footer,
  onPress,
  pressEffect,
  accessibilityLabel,
  style,
}: EntityCardProps) {
  const hasEyebrow = eyebrow != null && eyebrow !== false;
  const titleNode = renderTextOrNode(title, styles.title, 2);
  const subtitleNode = renderTextOrNode(subtitle, styles.subtitle);
  const eyebrowNode = renderTextOrNode(eyebrow, styles.eyebrow);

  const inner = (
    <>
      <View style={styles.top}>
        {leading ?? (icon ? <IconBadge icon={icon} tone={iconTone} size={iconSize} /> : null)}

        <View style={styles.body}>
          {hasEyebrow ? (
            <View style={styles.eyebrowRow}>
              <View style={styles.eyebrowFlex}>{eyebrowNode}</View>
              {pills ? <View style={styles.pillsRow}>{pills}</View> : null}
            </View>
          ) : null}

          {/* When no eyebrow, pills sit inline with the title. */}
          {!hasEyebrow && pills ? (
            <View style={styles.titleRow}>
              <View style={styles.titleFlex}>{titleNode}</View>
              <View style={styles.pillsRow}>{pills}</View>
            </View>
          ) : (
            titleNode
          )}

          {subtitleNode}
        </View>

        {right ?? null}
      </View>

      {meta != null ? (
        <View style={styles.metaWrap}>
          <View style={styles.divider} />
          {meta}
        </View>
      ) : null}

      {footer != null ? <View style={styles.footerWrap}>{footer}</View> : null}
    </>
  );

  if (onPress) {
    return (
      <PressableCard
        onPress={onPress}
        flush
        pressEffect={pressEffect}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={style}
      >
        {inner}
      </PressableCard>
    );
  }

  return (
    <Card flush style={style}>
      {inner}
    </Card>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  body: { flex: 1, gap: 2, minWidth: 0 },

  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  eyebrowFlex: { flex: 1, minWidth: 0 },
  eyebrow: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  titleFlex: { flex: 1, minWidth: 0 },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },

  pillsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },

  metaWrap: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  footerWrap: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
});


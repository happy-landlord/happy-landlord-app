import { forwardRef, type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";

import { theme } from "@/constants";

// ── Tokens ────────────────────────────────────────────────────────────────────
// Single source of truth for the "card" look used across list rows and panels.
// Tweaks here ripple everywhere — keep this list short.

const CARD_RADIUS = theme.radius.lg;
const CARD_PADDING = theme.spacing.md;

type CardTone = "default" | "danger" | "warning" | "success" | "info";

const toneBorder: Record<CardTone, string> = {
  default: theme.colors.border,
  danger: theme.colors.danger,
  warning: theme.colors.warning,
  success: theme.colors.success,
  info: theme.colors.info,
};

type BaseProps = {
  tone?: CardTone;
  /** Remove inner padding (e.g. when the card hosts a custom layout). */
  flush?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

// ── Card ──────────────────────────────────────────────────────────────────────
// Static surface card. Use for grouped content (dashboard sections, info
// panels, summary blocks).

export type CardProps = BaseProps & Omit<ViewProps, "style">;

export function Card({ tone = "default", flush, style, children, ...rest }: CardProps) {
  return (
    <View
      {...rest}
      style={[
        styles.base,
        { borderColor: toneBorder[tone] },
        !flush && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ── PressableCard ─────────────────────────────────────────────────────────────
// Interactive variant — same look as <Card> but with a consistent pressed
// feedback. Drop-in replacement for hand-rolled `<Pressable style={card}>`.

export type PressableCardProps = BaseProps & Omit<PressableProps, "style" | "children">;

export const PressableCard = forwardRef<View, PressableCardProps>(function PressableCard(
  { tone = "default", flush, style, children, ...rest },
  ref,
) {
  return (
    <Pressable
      ref={ref}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        { borderColor: toneBorder[tone] },
        !flush && styles.padded,
        pressed && styles.pressed,
        style as StyleProp<ViewStyle>,
      ]}
    >
      {children as ReactNode}
    </Pressable>
  );
});

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  base: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderRadius: CARD_RADIUS,
    overflow: "hidden",
  },
  padded: {
    padding: CARD_PADDING,
  },
  pressed: {
    opacity: 0.72,
  },
});


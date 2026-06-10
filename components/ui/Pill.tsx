import type { ReactNode } from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { theme } from "@/constants";

// ── Tokens ────────────────────────────────────────────────────────────────────
// Unified "pill" primitive replacing the half-dozen hand-rolled badges/chips
// scattered through the codebase (type badges, count pills, qty badges, status
// chips, ...).

export type PillTone =
  | "primary"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

export type PillVariant = "soft" | "solid";
export type PillSize = "sm" | "md";

const TONE: Record<
  PillTone,
  { soft: { bg: string; fg: string }; solid: { bg: string; fg: string } }
> = {
  primary: {
    soft: { bg: theme.colors.primarySoft, fg: theme.colors.primaryDark },
    solid: { bg: theme.colors.primary, fg: theme.colors.accent },
  },
  accent: {
    soft: { bg: theme.colors.accentSoft, fg: theme.colors.accent },
    solid: { bg: theme.colors.accent, fg: theme.colors.textInverse },
  },
  success: {
    soft: { bg: theme.colors.successSoft, fg: theme.colors.success },
    solid: { bg: theme.colors.success, fg: theme.colors.textInverse },
  },
  warning: {
    soft: { bg: theme.colors.warningSoft, fg: theme.colors.warning },
    solid: { bg: theme.colors.warning, fg: theme.colors.textInverse },
  },
  danger: {
    soft: { bg: theme.colors.dangerSoft, fg: theme.colors.danger },
    solid: { bg: theme.colors.danger, fg: theme.colors.textInverse },
  },
  info: {
    soft: { bg: theme.colors.infoSoft, fg: theme.colors.info },
    solid: { bg: theme.colors.info, fg: theme.colors.textInverse },
  },
  neutral: {
    soft: { bg: theme.colors.neutralSoft, fg: theme.colors.textMuted },
    solid: { bg: theme.colors.neutral, fg: theme.colors.textInverse },
  },
};

const SIZE_STYLE: Record<
  PillSize,
  { paddingHorizontal: number; paddingVertical: number; fontSize: number }
> = {
  sm: { paddingHorizontal: 7, paddingVertical: 2, fontSize: 11 },
  md: { paddingHorizontal: 10, paddingVertical: 3, fontSize: 12 },
};

export type PillProps = {
  tone?: PillTone;
  variant?: PillVariant;
  size?: PillSize;
  /** Optional leading icon/node rendered before the label. */
  leading?: ReactNode;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

export function Pill({
  tone = "primary",
  variant = "soft",
  size = "md",
  leading,
  style,
  children,
}: PillProps) {
  const colors = TONE[tone][variant];
  const sz = SIZE_STYLE[size];

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: colors.bg,
          paddingHorizontal: sz.paddingHorizontal,
          paddingVertical: sz.paddingVertical,
        },
        style,
      ]}
    >
      {leading}
      <Text
        style={[styles.label, { color: colors.fg, fontSize: sz.fontSize }]}
        numberOfLines={1}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    borderRadius: theme.radius.pill,
  },
  label: {
    fontWeight: "700",
  },
});

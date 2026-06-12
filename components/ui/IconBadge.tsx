import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { theme } from "@/constants";

// ── Tokens ────────────────────────────────────────────────────────────────────
// Standardised soft-bg icon container. Used everywhere a Lucide icon sits in a
// coloured square/circle (list rows, headers, modal summaries, ...).

export type IconBadgeTone =
  | "primary"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

export type IconBadgeSize = "sm" | "md" | "lg";
export type IconBadgeShape = "square" | "circle";

const SIZE: Record<IconBadgeSize, number> = {
  sm: 30,
  md: 40,
  lg: 48,
};

const ICON_SIZE: Record<IconBadgeSize, number> = {
  sm: 14,
  md: 18,
  lg: 22,
};

const TONE_BG: Record<IconBadgeTone, string> = {
  primary: theme.colors.primarySoft,
  accent: theme.colors.accentSoft,
  success: theme.colors.successSoft,
  warning: theme.colors.warningSoft,
  danger: theme.colors.dangerSoft,
  info: theme.colors.infoSoft,
  neutral: theme.colors.neutralSoft,
};

const TONE_FG: Record<IconBadgeTone, string> = {
  primary: theme.colors.primaryDark,
  accent: theme.colors.accent,
  success: theme.colors.success,
  warning: theme.colors.warning,
  danger: theme.colors.danger,
  info: theme.colors.info,
  neutral: theme.colors.textMuted,
};

// ── Component ─────────────────────────────────────────────────────────────────

type LucideLike = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

export type IconBadgeProps = {
  icon: LucideLike;
  tone?: IconBadgeTone;
  size?: IconBadgeSize;
  shape?: IconBadgeShape;
  /** Override icon color (defaults to the tone's foreground). */
  iconColor?: string;
  /** Override background color (defaults to the tone's soft background). */
  background?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
};

export function IconBadge({
  icon: Icon,
  tone = "primary",
  size = "md",
  shape = "square",
  iconColor,
  background,
  strokeWidth = 1.8,
  style,
}: IconBadgeProps) {
  const dim = SIZE[size];
  return (
    <View
      style={[
        styles.base,
        {
          width: dim,
          height: dim,
          borderRadius: shape === "circle" ? dim / 2 : theme.radius.md,
          backgroundColor: background ?? TONE_BG[tone],
        },
        style,
      ]}
    >
      <Icon
        size={ICON_SIZE[size]}
        color={iconColor ?? TONE_FG[tone]}
        strokeWidth={strokeWidth}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});

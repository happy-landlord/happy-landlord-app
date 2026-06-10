import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import type { ReactNode } from "react";

import { theme } from "@/constants";

// ── PillButton ────────────────────────────────────────────────────────────────
// Small, pill-shaped inline action button — used for Edit, Share QR, etc.
// Two colour schemes: "accent" (orange-tinted) and "primary" (brand-tinted).

export type PillButtonVariant = "accent" | "primary";

type PillButtonProps = Omit<PressableProps, "style"> & {
  label: string;
  variant?: PillButtonVariant;
  icon?: ReactNode;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PillButton({
  label,
  variant = "accent",
  icon,
  loading = false,
  disabled,
  style,
  ...props
}: PillButtonProps) {
  const isDisabled = disabled || loading;
  const v = variantStyles[variant];

  return (
    <Pressable
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        v.container,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      accessibilityRole="button"
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.spinnerColor} />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, v.label]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    minWidth: 72,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.65 },
});

const variantStyles: Record<
  PillButtonVariant,
  {
    container: StyleProp<ViewStyle>;
    label: { color: string };
    spinnerColor: string;
  }
> = {
  accent: {
    container: {
      backgroundColor: theme.colors.accentSoft,
      borderWidth: 1,
      borderColor: theme.colors.accent + "40",
    },
    label: { color: theme.colors.accent },
    spinnerColor: theme.colors.accent,
  },
  primary: {
    container: {
      backgroundColor: theme.colors.primarySoft,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    label: { color: theme.colors.primary },
    spinnerColor: theme.colors.primary,
  },
};


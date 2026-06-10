import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import type { ReactNode } from "react";

import { theme } from "@/constants";

type ButtonVariant =
  | "primary"
  | "primaryOutline"
  | "accent"
  | "accentSoft"
  | "outline"
  | "ghost"
  | "danger"
  | "success"
  | "successOutline"
  | "dangerOutline"
  | "warningOutline";

type ButtonSize = "sm" | "md";

type ButtonProps = Omit<PressableProps, "style"> & {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Optional icon rendered to the left of the title. */
  icon?: ReactNode;
  /** Optional override for the outer container style. */
  style?: StyleProp<ViewStyle>;
};

export function Button({
  title,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  icon,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        size === "sm" ? styles.baseSm : styles.baseMd,
        variantStyles[variant].container,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles[variant].spinner} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text
            style={[
              styles.label,
              size === "sm" ? styles.labelSm : styles.labelMd,
              variantStyles[variant].label,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 20,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  baseMd: {
    minHeight: 48,
    paddingVertical: 12,
  },
  baseSm: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: theme.radius.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontWeight: "600",
  },
  labelMd: { fontSize: 16 },
  labelSm: { fontSize: 13 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
});

const variantStyles: Record<
  ButtonVariant,
  { container: StyleProp<ViewStyle>; label: { color: string }; spinner: string }
> = {
  primary: {
    container: { backgroundColor: theme.colors.primary },
    label: { color: theme.colors.primaryText },
    spinner: theme.colors.primaryText,
  },
  primaryOutline: {
    container: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1.5,
      borderColor: theme.colors.primary,
    },
    label: { color: theme.colors.primary },
    spinner: theme.colors.primary,
  },
  accent: {
    container: { backgroundColor: theme.colors.accent },
    label: { color: theme.colors.textInverse },
    spinner: theme.colors.textInverse,
  },
  accentSoft: {
    container: { backgroundColor: theme.colors.accentSoft },
    label: { color: theme.colors.accent },
    spinner: theme.colors.accent,
  },
  outline: {
    container: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    label: { color: theme.colors.text },
    spinner: theme.colors.text,
  },
  ghost: {
    container: { backgroundColor: "transparent" },
    label: { color: theme.colors.primary },
    spinner: theme.colors.primary,
  },
  danger: {
    container: { backgroundColor: theme.colors.danger },
    label: { color: theme.colors.textInverse },
    spinner: theme.colors.textInverse,
  },
  success: {
    container: { backgroundColor: theme.colors.success },
    label: { color: theme.colors.textInverse },
    spinner: theme.colors.textInverse,
  },
  successOutline: {
    container: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1.5,
      borderColor: theme.colors.success,
    },
    label: { color: theme.colors.success },
    spinner: theme.colors.success,
  },
  dangerOutline: {
    container: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1.5,
      borderColor: theme.colors.danger,
    },
    label: { color: theme.colors.danger },
    spinner: theme.colors.danger,
  },
  warningOutline: {
    container: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1.5,
      borderColor: theme.colors.warning,
    },
    label: { color: theme.colors.warning },
    spinner: theme.colors.warning,
  },
};

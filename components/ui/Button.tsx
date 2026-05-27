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

import { theme } from "@/constants/theme";

type ButtonVariant = "primary" | "accent" | "outline" | "ghost" | "danger";

type ButtonProps = Omit<PressableProps, "style"> & {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  /** Optional override for the outer container style. */
  style?: StyleProp<ViewStyle>;
};

export function Button({
  title,
  variant = "primary",
  loading = false,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
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
          <Text style={[styles.label, variantStyles[variant].label]}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
});

const variantStyles: Record<
  ButtonVariant,
  { container: StyleProp<ViewStyle>; label: { color: string }; spinner: string }
> = {
  primary: {
    container: { backgroundColor: theme.colors.primary },
    label: { color: theme.colors.textInverse },
    spinner: theme.colors.textInverse,
  },
  accent: {
    container: { backgroundColor: theme.colors.accent },
    label: { color: theme.colors.text },
    spinner: theme.colors.text,
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
};

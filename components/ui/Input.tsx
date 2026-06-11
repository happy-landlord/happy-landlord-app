import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";

import { theme } from "@/constants";

type InputProps = TextInputProps & {
  /** Floating label that sits on the top border */
  label?: string;
  /** Shows below the input in danger colour */
  error?: string;
  /** Marks the label with a red asterisk */
  required?: boolean;
  /** Optional icon/element rendered on the right inside the border */
  rightIcon?: React.ReactNode;
  /** Style override for the outer border container */
  containerStyle?: ViewStyle;
  /** Background colour of the floating label pill — should match the parent surface */
  labelBackground?: string;
};

export function Input({
  label,
  error,
  required,
  rightIcon,
  containerStyle,
  labelBackground,
  multiline,
  style,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(error);

  return (
    <View style={[styles.outer, containerStyle]}>
      <View
        style={[
          styles.wrap,
          multiline ? styles.wrapMultiline : styles.wrapSingle,
          focused && styles.wrapFocused,
          hasError && styles.wrapError,
        ]}
      >
        {label ? (
          <Text
            style={[
              styles.label,
              labelBackground ? { backgroundColor: labelBackground } : undefined,
              focused && styles.labelFocused,
              hasError && styles.labelError,
            ]}
            numberOfLines={1}
          >
            {label}
            {required ? <Text style={styles.asterisk}> *</Text> : null}
          </Text>
        ) : null}

        <View style={styles.row}>
          <TextInput
            style={[styles.input, multiline && styles.inputMultiline, style]}
            placeholderTextColor={theme.colors.textLight}
            selectionColor={theme.colors.primary}
            multiline={multiline}
            textAlignVertical={multiline ? "top" : undefined}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            {...props}
          />
          {rightIcon ? <View style={styles.iconWrap}>{rightIcon}</View> : null}
        </View>
      </View>

      {hasError ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginTop: 10,
  },
  wrap: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
  },
  wrapSingle: {
    height: 48,
    justifyContent: "center",
  },
  wrapMultiline: {
    minHeight: 112,
    paddingTop: 4,
    paddingBottom: 4,
  },
  wrapFocused: {
    borderColor: theme.colors.primary,
  },
  wrapError: {
    borderColor: theme.colors.danger,
  },

  label: {
    position: "absolute",
    top: -9,
    left: 10,
    paddingHorizontal: 4,
    backgroundColor: theme.colors.surfaceWarm,
    fontSize: 11,
    fontWeight: "500",
    color: theme.colors.textMuted,
    lineHeight: 18,
    zIndex: 10,
  },
  labelFocused: {
    color: theme.colors.primary,
  },
  labelError: {
    color: theme.colors.danger,
  },
  asterisk: {
    color: theme.colors.danger,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
    paddingVertical: 0,
    paddingHorizontal: 0,
    height: 46,
  },
  inputMultiline: {
    height: undefined,
    minHeight: 88,
    paddingTop: 12,
    paddingBottom: 12,
  },
  iconWrap: {
    marginLeft: theme.spacing.sm,
  },

  error: {
    fontSize: 11,
    color: theme.colors.danger,
    paddingHorizontal: 4,
    paddingBottom: 4,
    marginTop: 2,
  },
});

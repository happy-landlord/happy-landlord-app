import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { theme } from "@/constants";

export type ToggleOption<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  label?: string;
  options: readonly [ToggleOption<T>, ToggleOption<T>];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

/** Controlled two-value segmented toggle styled like the app's form fields. */
export function Toggle<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
  containerStyle,
}: Props<T>) {
  return (
    <View
      style={[styles.field, disabled && styles.fieldDisabled, containerStyle]}
    >
      {label ? (
        <Text style={[styles.label, disabled && styles.labelDisabled]}>
          {label}
        </Text>
      ) : null}

      <View style={[styles.options, disabled && styles.optionsDisabled]}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && !disabled && styles.optionPressed,
              ]}
              onPress={() => onChange(option.value)}
              disabled={disabled}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled }}
              accessibilityLabel={
                label ? `${label}: ${option.label}` : option.label
              }
            >
              <Text
                style={[
                  styles.optionText,
                  selected && styles.optionTextSelected,
                  disabled && styles.optionTextDisabled,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginTop: 10,
    gap: 5,
  },
  fieldDisabled: { opacity: 0.6 },
  label: {
    paddingHorizontal: 4,
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 16,
    color: theme.colors.textMuted,
  },
  labelDisabled: { color: theme.colors.textDisabled },
  options: {
    height: 48,
    flexDirection: "row",
    gap: 3,
    padding: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.neutralSoft,
  },
  optionsDisabled: { backgroundColor: theme.colors.accentSoft },
  option: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.sm,
  },
  optionSelected: {
    backgroundColor: theme.colors.accent,
    shadowColor: theme.colors.accent,
    shadowOpacity: 0.14,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  optionPressed: { opacity: 0.72 },
  optionText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  optionTextSelected: {
    fontWeight: "700",
    color: theme.colors.textInverse,
  },
  optionTextDisabled: { color: theme.colors.textDisabled },
});

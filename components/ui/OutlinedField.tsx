import { StyleSheet, Text, View, Pressable, type ViewStyle } from "react-native";
import { ChevronDown, CalendarDays } from "lucide-react-native";

import { theme } from "@/constants/theme";

// ── OutlinedField ─────────────────────────────────────────────────────────────

type OutlinedFieldProps = {
  label: string;
  required?: boolean;
  focused?: boolean;
  style?: ViewStyle;
  children: React.ReactNode;
};

/**
 * Material Design "outlined" container — label floats on the top border line.
 * Use as a shell around any interactive content (TextInput, Pressable, etc.).
 */
export function OutlinedField({
  label,
  required,
  focused,
  style,
  children,
}: OutlinedFieldProps) {
  return (
    <View style={[styles.wrap, focused && styles.wrapFocused, style]}>
      <Text style={[styles.label, focused && styles.labelFocused]} numberOfLines={1}>
        {label}
        {required ? <Text style={styles.asterisk}> *</Text> : null}
      </Text>
      {children}
    </View>
  );
}

// ── OutlinedSelect ────────────────────────────────────────────────────────────

type OutlinedSelectProps = {
  label: string;
  required?: boolean;
  value: string;
  onPress: () => void;
  style?: ViewStyle;
};

/** Pressable dropdown trigger styled as an outlined field. */
export function OutlinedSelect({
  label,
  required,
  value,
  onPress,
  style,
}: OutlinedSelectProps) {
  return (
    <OutlinedField label={label} required={required} style={style}>
      <Pressable style={styles.select} onPress={onPress} accessibilityRole="button">
        <Text style={styles.selectText} numberOfLines={1}>
          {value}
        </Text>
        <ChevronDown size={16} color={theme.colors.textMuted} strokeWidth={2} />
      </Pressable>
    </OutlinedField>
  );
}

// ── OutlinedDateField ─────────────────────────────────────────────────────────

type OutlinedDateFieldProps = {
  label: string;
  required?: boolean;
  value: string;
  onPress: () => void;
  style?: ViewStyle;
};

/** Date field with calendar icon, styled as an outlined field. */
export function OutlinedDateField({
  label,
  required,
  value,
  onPress,
  style,
}: OutlinedDateFieldProps) {
  return (
    <OutlinedField label={label} required={required} style={style}>
      <Pressable style={styles.select} onPress={onPress} accessibilityRole="button">
        <Text style={styles.selectText}>{value}</Text>
        <CalendarDays size={16} color={theme.colors.textMuted} strokeWidth={2} />
      </Pressable>
    </OutlinedField>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    justifyContent: "center",
  },
  wrapFocused: {
    borderColor: theme.colors.primary,
  },
  label: {
    position: "absolute",
    top: -9,
    left: 10,
    paddingHorizontal: 4,
    backgroundColor: theme.colors.background,
    fontSize: 11,
    fontWeight: "500",
    color: theme.colors.textMuted,
    lineHeight: 18,
    zIndex: 10,
  },
  labelFocused: {
    color: theme.colors.primary,
  },
  asterisk: {
    color: theme.colors.danger,
  },
  select: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 46,
  },
  selectText: {
    fontSize: 15,
    color: theme.colors.text,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
});


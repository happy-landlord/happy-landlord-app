import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { theme } from "@/constants";

// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  /** Current OTP value — only digits, max `length` chars. */
  value: string;
  /** Called with the new digit-only string whenever the user types. */
  onChange: (value: string) => void;
  /** Number of digit boxes. Defaults to 6. */
  length?: number;
  /** Highlights all boxes in the error state (red border + background). */
  hasError?: boolean;
  /** Focus the input automatically when the component mounts. */
  autoFocus?: boolean;
  /** Disable all interaction (e.g. while a verify request is in-flight). */
  disabled?: boolean;
};

/**
 * OtpInput
 *
 * Renders a row of individual digit boxes backed by a single hidden
 * `TextInput`. Tapping any box focuses the hidden input so the native
 * keyboard appears immediately.
 *
 * Usage:
 * ```tsx
 * const [code, setCode] = useState("");
 *
 * <OtpInput
 *   value={code}
 *   onChange={setCode}
 *   hasError={verifyMutation.isError}
 *   autoFocus
 * />
 * ```
 */
export function OtpInput({
  value,
  onChange,
  length = 6,
  hasError = false,
  autoFocus = false,
  disabled = false,
}: Props) {
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  const handleChange = (text: string) => {
    onChange(text.replace(/\D/g, "").slice(0, length));
  };

  const digits = value
    .split("")
    .concat(Array(length).fill(""))
    .slice(0, length);

  return (
    <View>
      {/* Hidden native input that captures all keystrokes */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={length}
        style={styles.hiddenInput}
        caretHidden
        editable={!disabled}
        accessibilityLabel={`Enter your ${length}-digit verification code`}
      />

      {/* Visual digit boxes */}
      <Pressable
        style={styles.row}
        onPress={() => !disabled && inputRef.current?.focus()}
        accessibilityRole="none"
      >
        {digits.map((d, i) => (
          <View
            key={i}
            style={[
              styles.box,
              value.length === i && !disabled && styles.boxActive,
              value.length > i && styles.boxFilled,
              hasError && styles.boxError,
            ]}
          >
            <Text style={[styles.digit, hasError && styles.digitError]}>
              {d}
            </Text>
          </View>
        ))}
      </Pressable>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginVertical: theme.spacing.xs,
  },
  box: {
    width: 44,
    height: 54,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  boxActive: {
    borderColor: theme.colors.accent,
    borderWidth: 2,
  },
  boxFilled: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentSoft,
  },
  boxError: {
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.dangerSoft,
  },
  digit: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.text,
  },
  digitError: {
    color: theme.colors.danger,
  },
});


import { Linking, Pressable, StyleSheet, Text } from "react-native";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import { Phone } from "lucide-react-native";

import { theme } from "@/constants";

// ── PhoneLink ─────────────────────────────────────────────────────────────────
// A tappable phone number that opens the native dialler on press.
// Drop-in replacement for any <Text> that shows a phone number.
//
// Usage:
//   <PhoneLink phone="+61 4xx xxx xxx" />
//   <PhoneLink phone={number} showIcon iconColor={theme.colors.textMuted} textStyle={styles.contactText} />

export type PhoneLinkProps = {
  phone: string;
  /** Renders a Phone icon to the left of the number. Default: false */
  showIcon?: boolean;
  iconSize?: number;
  iconColor?: string;
  /** Style applied to the number text. Accepts arrays (StyleProp). */
  textStyle?: StyleProp<TextStyle>;
  /** Style applied to the outer Pressable row. */
  style?: ViewStyle;
};

export function PhoneLink({
  phone,
  showIcon = false,
  iconSize = 14,
  iconColor = theme.colors.primary,
  textStyle,
  style,
}: PhoneLinkProps) {
  const handlePress = () => {
    // Strip spaces so the dialler receives a clean number.
    const cleaned = phone.replace(/\s+/g, "");
    Linking.openURL(`tel:${cleaned}`).catch(() => {});
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.row, style, pressed && styles.pressed]}
      accessibilityRole="link"
      accessibilityLabel={`Call ${phone}`}
      hitSlop={4}
    >
      {showIcon ? (
        <Phone size={iconSize} color={iconColor} strokeWidth={2} />
      ) : null}
      <Text style={[styles.text, textStyle]} numberOfLines={1}>
        {phone}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pressed: { opacity: 0.6 },
  text: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.primary,
  },
});


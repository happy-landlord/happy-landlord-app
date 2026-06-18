import { Linking, Pressable, StyleSheet, Text } from "react-native";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import { Phone } from "lucide-react-native";
import { theme } from "@/constants";
import { formatAustralianPhoneForDisplay } from "@/lib/utils/phone";
// ── PhoneLink ─────────────────────────────────────────────────────────────────
// A tappable phone number that opens the native dialler on press.
// Displays in friendly AU format (0410 382 251) when stored as E.164.
//
// Usage:
//   <PhoneLink phone="+61410382251" />
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
    // Strip spaces so the dialler receives a clean E.164 number.
    const cleaned = phone.replace(/\s+/g, "");
    Linking.openURL(`tel:${cleaned}`).catch(() => {});
  };
  // Display in friendly AU format (0410 382 251) if stored as E.164,
  // otherwise fall back to the raw value.
  const displayPhone = formatAustralianPhoneForDisplay(phone);
  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.row, style, pressed && styles.pressed]}
      accessibilityRole="link"
      accessibilityLabel={`Call ${displayPhone}`}
      hitSlop={4}
    >
      {showIcon ? (
        <Phone size={iconSize} color={iconColor} strokeWidth={2} />
      ) : null}
      <Text style={[styles.text, textStyle]} numberOfLines={1}>
        {displayPhone}
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

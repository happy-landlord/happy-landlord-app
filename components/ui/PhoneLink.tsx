import {
  Alert,
  Linking,
  Pressable,
  Share,
  StyleSheet,
  Text,
} from "react-native";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Phone } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

import { theme } from "@/constants";
import { formatAustralianPhoneForDisplay } from "@/lib/utils/phone";

// ── PhoneLink ─────────────────────────────────────────────────────────────────
// Tap        → light haptic + opens the native dialler.
// Long-press → medium haptic + action sheet: Call / Copy / Share.

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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PhoneLink({
  phone,
  showIcon = false,
  iconSize = 14,
  iconColor = theme.colors.primary,
  textStyle,
  style,
}: PhoneLinkProps) {
  const cleaned = phone.replace(/\s+/g, "");
  const displayPhone = formatAustralianPhoneForDisplay(phone);

  // ── Spring scale ────────────────────────────────────────────────────────────
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    scale.value = withSpring(0.94, { damping: 15, stiffness: 400 });
  };
  const onPressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 300 });
  };

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Linking.openURL(`tel:${cleaned}`).catch(() => {});
  };

  const handleLongPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(displayPhone, undefined, [
      {
        text: "Call",
        onPress: () => Linking.openURL(`tel:${cleaned}`).catch(() => {}),
      },
      {
        text: "Copy",
        onPress: async () => {
          await Clipboard.setStringAsync(displayPhone);
          Toast.show({
            type: "success",
            text1: "Copied",
            text2: displayPhone,
            visibilityTime: 2000,
          });
        },
      },
      {
        text: "Share",
        onPress: () => Share.share({ message: displayPhone }).catch(() => {}),
      },
      { text: "Cancel", style: "destructive" },
    ]);
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      delayLongPress={400}
      style={[styles.row, style, animatedStyle]}
      accessibilityRole="link"
      accessibilityLabel={`Call ${displayPhone}`}
      accessibilityHint="Long-press to copy or share"
      hitSlop={4}
    >
      {showIcon ? (
        <Phone size={iconSize} color={iconColor} strokeWidth={2} />
      ) : null}
      <Text style={[styles.text, textStyle]} numberOfLines={1}>
        {displayPhone}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.primary,
  },
});

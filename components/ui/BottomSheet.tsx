import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "@/constants/theme";

const SHEET_TRANSLATE_OUT = 500;

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Extra style applied to the sheet container (e.g. padding overrides). */
  containerStyle?: StyleProp<ViewStyle>;
  /** Hide the drag handle at the top. */
  hideHandle?: boolean;
  /** Backdrop colour. */
  backdropColor?: string;
  /** Whether the modal sits over the system status bar. Default true. */
  statusBarTranslucent?: boolean;
};

/**
 * Reusable bottom-sheet primitive (homegrown — no native lib needed).
 *
 * - Backdrop fades in/out independently from the sliding panel
 * - Stays mounted until exit animation completes
 * - Auto-respects bottom safe-area inset
 * - Tap on backdrop or hardware back → `onClose`
 */
export function BottomSheet({
  visible,
  onClose,
  children,
  containerStyle,
  hideHandle = false,
  backdropColor = "rgba(0,0,0,0.4)",
  statusBarTranslucent = true,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();

  // Keep the modal mounted until the exit animation finishes so the slide
  // and fade actually play.
  const [modalVisible, setModalVisible] = useState(visible);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SHEET_TRANSLATE_OUT)).current;

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SHEET_TRANSLATE_OUT,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => setModalVisible(false));
    }
  }, [visible, fadeAnim, slideAnim]);

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent={statusBarTranslucent}
    >
      {/* Backdrop fades independently */}
      <Animated.View
        style={[
          styles.backdrop,
          { backgroundColor: backdropColor, opacity: fadeAnim },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Sheet slides up independently */}
      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: insets.bottom + theme.spacing.md },
          { transform: [{ translateY: slideAnim }] },
          containerStyle,
        ]}
      >
        {!hideHandle && <View style={styles.handle} />}
        {children}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.screen,
    shadowColor: theme.colors.charcoal,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
});

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
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

import { theme } from "@/constants";

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
  /**
   * How the sheet reacts when the keyboard appears.
   * - `"position"` (default): lifts the entire sheet so its bottom sits on top
   *   of the keyboard. Best for short sheets whose natural height is much
   *   smaller than the screen.
   * - `"none"`: no automatic avoidance — the sheet stays put. Use for tall
   *   sheets (e.g. those with an internal `ScrollView` that already handles
   *   keyboard insets via `automaticallyAdjustKeyboardInsets`).
   */
  keyboardBehavior?: "position" | "none";
  /**
   * Extra content rendered INSIDE the Modal but outside the sliding sheet.
   * Use this to place absolutely-positioned overlays (e.g. a right-side picker
   * panel) within the same Modal context, avoiding React Native's iOS
   * restriction on nested Modals.
   */
  overlayChildren?: ReactNode;
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
  backdropColor = theme.colors.accentDark + "66",
  statusBarTranslucent = true,
  keyboardBehavior = "position",
  overlayChildren,
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

      {/* Sheet slides up independently. When `keyboardBehavior="position"`,
          `KeyboardAvoidingView` lifts the whole sheet so its bottom sits on
          top of the keyboard. The negative `keyboardVerticalOffset` cancels
          out the sheet's bottom safe-area padding (unnecessary while the
          keyboard is up) leaving a small breathing gap above the keyboard.
          Tall sheets with internal scrolling should opt out via
          `keyboardBehavior="none"` and handle keyboard insets inside their
          own ScrollView. */}
      {keyboardBehavior === "position" ? (
        <KeyboardAvoidingView
          behavior="position"
          style={styles.avoider}
          keyboardVerticalOffset={
            -(insets.bottom + theme.spacing.md) + theme.spacing.sm
          }
        >
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
        </KeyboardAvoidingView>
      ) : (
        <Animated.View
          style={[
            styles.sheet,
            styles.sheetAnchored,
            { paddingBottom: insets.bottom + theme.spacing.md },
            { transform: [{ translateY: slideAnim }] },
            containerStyle,
          ]}
        >
          {!hideHandle && <View style={styles.handle} />}
          {children}
        </Animated.View>
      )}

      {/* Optional overlay content (e.g. right-side picker panel) */}
      {overlayChildren}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  avoider: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.screen,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
  },
  sheetAnchored: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
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

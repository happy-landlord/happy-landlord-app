import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Fingerprint, X } from "lucide-react-native";

import { theme } from "@/constants";

type BiometricEnablePromptProps = {
  visible: boolean;
  /** e.g. "Face ID" or "Fingerprint" */
  biometricLabel: string;
  onEnable: () => void;
  onDismiss: () => void;
};

export function BiometricEnablePrompt({
  visible,
  biometricLabel,
  onEnable,
  onDismiss,
}: BiometricEnablePromptProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + theme.spacing.lg },
          ]}
        >
          {/* Dismiss button */}
          <Pressable
            onPress={onDismiss}
            style={({ pressed }) => [
              styles.closeBtn,
              pressed && { opacity: 0.6 },
            ]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Maybe later"
          >
            <X size={20} color={theme.colors.textLight} strokeWidth={2} />
          </Pressable>

          {/* Icon */}
          <View style={styles.iconWrap}>
            <Fingerprint
              size={38}
              color={theme.colors.primary}
              strokeWidth={1.5}
            />
          </View>

          <Text style={styles.title}>Enable {biometricLabel} login?</Text>
          <Text style={styles.body}>
            Skip the password next time. {biometricLabel} lets you unlock Happy
            Landlord quickly and securely on this device.
          </Text>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              onPress={onEnable}
              style={({ pressed }) => [
                styles.enableBtn,
                pressed && { opacity: 0.8 },
              ]}
              accessibilityRole="button"
            >
              <Fingerprint
                size={17}
                color={theme.colors.accent}
                strokeWidth={2}
              />
              <Text style={styles.enableBtnText}>Enable {biometricLabel}</Text>
            </Pressable>

            <Pressable
              onPress={onDismiss}
              style={({ pressed }) => [
                styles.laterBtn,
                pressed && { opacity: 0.6 },
              ]}
              accessibilityRole="button"
            >
              <Text style={styles.laterBtnText}>Maybe later</Text>
            </Pressable>
          </View>

          <Text style={styles.note}>
            You can change this at any time in Settings → Security.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.colors.accentDark + "80",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.screen,
    alignItems: "center",
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 14,
  },
  closeBtn: {
    position: "absolute",
    top: theme.spacing.md,
    right: theme.spacing.screen,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.neutralSoft,
  },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },
  body: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 21,
    maxWidth: 320,
    marginBottom: theme.spacing.lg,
  },
  actions: {
    width: "100%",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  enableBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingVertical: 14,
  },
  enableBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.accent,
  },
  laterBtn: {
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  laterBtnText: {
    fontSize: 15,
    color: theme.colors.textMuted,
    fontWeight: "500",
  },
  note: {
    fontSize: 11,
    color: theme.colors.textLight,
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },
});

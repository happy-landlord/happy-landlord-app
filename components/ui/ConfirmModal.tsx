import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { theme } from "@/constants";

// ── ConfirmModal ──────────────────────────────────────────────────────────────
// Shared shell extracted from the trio of `<Checkout|Return|Transfer>ConfirmModal`
// components. Provides the centered card, backdrop, title/subtitle and the
// two-button (Cancel + Confirm) action row.
//
// Content between header and actions is passed via `children` so each caller
// can compose its own summary section.

export type ConfirmModalTone = "primary" | "success" | "danger";

export type ConfirmModalProps = {
  visible: boolean;
  title: string;
  subtitle?: string;
  /** Body content (typically a summary block). */
  children?: ReactNode;
  /** Label of the right-hand confirm button. */
  confirmLabel: string;
  /** Tone of the confirm button. Defaults to `primary`. */
  confirmTone?: ConfirmModalTone;
  /** Optional override for the confirm-button background color. */
  confirmColor?: string;
  /** Label of the left-hand cancel button. Defaults to `Cancel`. */
  cancelLabel?: string;
  /** When true, shows a spinner inside the confirm button and disables both. */
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

const TONE_BG: Record<ConfirmModalTone, string> = {
  primary: theme.colors.primary,
  success: theme.colors.success,
  danger: theme.colors.danger,
};

const TONE_TEXT: Record<ConfirmModalTone, string> = {
  primary: theme.colors.accent,
  success: theme.colors.textInverse,
  danger: theme.colors.textInverse,
};

export function ConfirmModal({
  visible,
  title,
  subtitle,
  children,
  confirmLabel,
  confirmTone = "primary",
  confirmColor,
  cancelLabel = "Cancel",
  isPending,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  const handleDismiss = isPending ? undefined : onCancel;
  const confirmBg = confirmColor ?? TONE_BG[confirmTone];
  const confirmTextColor = TONE_TEXT[confirmTone];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={handleDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        />

        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

          {children}

          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              disabled={isPending}
              style={({ pressed }) => [
                styles.btn,
                styles.btnCancel,
                pressed && !isPending && styles.btnPressed,
                isPending && styles.btnDisabled,
              ]}
              accessibilityRole="button"
              accessibilityState={{ disabled: isPending }}
            >
              <Text style={styles.btnCancelLabel} numberOfLines={1}>
                {cancelLabel}
              </Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              disabled={isPending}
              style={({ pressed }) => [
                styles.btn,
                { backgroundColor: confirmBg },
                pressed && !isPending && styles.btnPressed,
                isPending && styles.btnDisabled,
              ]}
              accessibilityRole="button"
              accessibilityState={{ disabled: isPending }}
            >
              {isPending ? (
                <ActivityIndicator size="small" color={confirmTextColor} />
              ) : null}
              <Text
                style={[styles.btnConfirmLabel, { color: confirmTextColor }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.88}
              >
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.md,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.accentDark + "75",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginTop: -theme.spacing.sm,
  },
  actions: {
    flexDirection: "row",
    width: "100%",
    gap: theme.spacing.sm,
  },
  btn: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: theme.spacing.sm,
  },
  btnCancel: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  btnPressed: { opacity: 0.75 },
  btnDisabled: { opacity: 0.7 },
  btnCancelLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  btnConfirmLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: theme.colors.textInverse,
  },
});

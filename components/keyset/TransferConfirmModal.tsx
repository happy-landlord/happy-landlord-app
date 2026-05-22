import { memo } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowLeftRight, UserCheck } from "lucide-react-native";

import { theme } from "@/constants/theme";

export type TransferConfirmModalProps = {
  visible: boolean;
  /** Name of the agent currently holding the keyset. */
  currentHolderName?: string | null;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export const TransferConfirmModal = memo(function TransferConfirmModal({
  visible,
  currentHolderName,
  isPending,
  onCancel,
  onConfirm,
}: TransferConfirmModalProps) {
  const handleDismiss = isPending ? undefined : onCancel;

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
          accessibilityLabel="Dismiss transfer"
        />

        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <ArrowLeftRight size={26} color={theme.colors.primary} strokeWidth={1.8} />
          </View>

          <Text style={styles.title}>Transfer to you?</Text>
          <Text style={styles.subtitle}>
            The keyset will be immediately transferred into your custody. You will be
            responsible for returning it when done.
          </Text>

          {/* Current holder info */}
          {currentHolderName ? (
            <View style={styles.holderBox}>
              <View style={styles.holderIcon}>
                <UserCheck size={14} color={theme.colors.primary} strokeWidth={1.8} />
              </View>
              <View style={styles.holderTextBlock}>
                <Text style={styles.holderLabel}>Currently with</Text>
                <Text style={styles.holderName} numberOfLines={1}>
                  {currentHolderName}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.actions}>
            <ActionButton
              variant="cancel"
              label="Cancel"
              disabled={isPending}
              onPress={onCancel}
            />
            <ActionButton
              variant="confirm"
              label={isPending ? "Transferring…" : "Transfer to me"}
              loading={isPending}
              disabled={isPending}
              onPress={onConfirm}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
});

// ─── Sub-components ────────────────────────────────────────────────────────

type ActionButtonProps = {
  label: string;
  variant: "cancel" | "confirm";
  disabled: boolean;
  loading?: boolean;
  onPress: () => void;
};

function ActionButton({ label, variant, disabled, loading, onPress }: ActionButtonProps) {
  const isCancel = variant === "cancel";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        isCancel ? styles.btnCancel : styles.btnConfirm,
        pressed && !disabled && styles.btnPressed,
        disabled && styles.btnDisabled,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      {loading ? <ActivityIndicator size="small" color="#fff" /> : null}
      <Text
        style={isCancel ? styles.btnCancelLabel : styles.btnConfirmLabel}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.88}
      >
        {label}
      </Text>
    </Pressable>
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
    backgroundColor: "rgba(38, 38, 38, 0.46)",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    shadowColor: theme.colors.charcoal,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 10,
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.sm,
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
    marginTop: theme.spacing.xs,
  },
  holderBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    width: "100%",
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary + "26",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    marginTop: theme.spacing.md,
  },
  holderIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  holderTextBlock: {
    flex: 1,
    gap: 2,
  },
  holderLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  holderName: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text,
  },
  actions: {
    flexDirection: "row",
    width: "100%",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
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
  btnConfirm: {
    backgroundColor: theme.colors.primary,
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


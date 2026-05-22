import { memo } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Archive, CheckCircle2, KeyRound } from "lucide-react-native";

import { theme } from "@/constants/theme";

export type ReturnConfirmModalProps = {
  visible: boolean;
  /** Property code to direct the agent to the correct cabinet slot. */
  propertyCode?: string | null;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export const ReturnConfirmModal = memo(function ReturnConfirmModal({
  visible,
  propertyCode,
  isPending,
  onCancel,
  onConfirm,
}: ReturnConfirmModalProps) {
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
          accessibilityLabel="Dismiss return"
        />

        <View style={styles.card}>
          {/* Icon */}
          <View style={styles.iconWrap}>
            <KeyRound size={26} color={theme.colors.primary} strokeWidth={1.8} />
          </View>

          <Text style={styles.title}>Return to cabinet?</Text>
          <Text style={styles.subtitle}>
            Place the keys back in the cabinet slot organised by property code.
          </Text>

          {/* Cabinet placement guide */}
          <View style={styles.guideBox}>
            <View style={styles.guideHeader}>
              <Archive size={15} color={theme.colors.primary} strokeWidth={1.8} />
              <Text style={styles.guideHeaderText}>Cabinet placement guide</Text>
            </View>

            <View style={styles.guideDivider} />

            <View style={styles.guideStepRow}>
              <StepBadge number={1} />
              <Text style={styles.guideStepText}>
                Locate the key cabinet in the office.
              </Text>
            </View>

            <View style={styles.guideStepRow}>
              <StepBadge number={2} />
              <Text style={styles.guideStepText}>
                Find the slot labelled{" "}
                {propertyCode ? (
                  <Text style={styles.codeHighlight}>{propertyCode}</Text>
                ) : (
                  "with the property code"
                )}
                .
              </Text>
            </View>

            <View style={styles.guideStepRow}>
              <StepBadge number={3} />
              <Text style={styles.guideStepText}>
                Hang the keys securely on the hook for that property code.
              </Text>
            </View>

            <View style={styles.guideStepRow}>
              <StepBadge number={4} />
              <View style={styles.confirmRowInner}>
                <CheckCircle2 size={13} color={theme.colors.success} strokeWidth={2} />
                <Text style={styles.guideStepText}>
                  Tap <Text style={styles.confirmWord}>Confirm return</Text> below.
                </Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <ActionButton
              variant="cancel"
              label="Cancel"
              disabled={isPending}
              onPress={onCancel}
            />
            <ActionButton
              variant="confirm"
              label={isPending ? "Returning…" : "Confirm return"}
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

function StepBadge({ number }: { number: number }) {
  return (
    <View style={styles.stepBadge}>
      <Text style={styles.stepBadgeText}>{number}</Text>
    </View>
  );
}

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

  // ── Guide box ──────────────────────────────────────────────────
  guideBox: {
    width: "100%",
    backgroundColor: theme.colors.surfaceWarm,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: theme.spacing.md,
    overflow: "hidden",
    paddingBottom: theme.spacing.sm,
  },
  guideHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
  },
  guideHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  guideDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  guideStepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 5,
  },
  guideStepText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 19,
  },
  confirmRowInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  confirmWord: {
    fontWeight: "700",
    color: theme.colors.text,
  },
  codeHighlight: {
    fontWeight: "800",
    color: theme.colors.primary,
  },

  // ── Step badge ─────────────────────────────────────────────────
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.primary,
  },

  // ── Buttons ────────────────────────────────────────────────────
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
    backgroundColor: theme.colors.danger,
  },
  btnPressed: {
    opacity: 0.75,
  },
  btnDisabled: {
    opacity: 0.7,
  },
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


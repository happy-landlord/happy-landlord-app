import { memo, type ReactNode } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Archive, Calendar, CheckCircle2, KeyRound } from "lucide-react-native";

import { KEY_TYPE_ICON, KEY_TYPE_LABEL } from "@/components/key/keyLabels";
import { theme } from "@/constants/theme";
import { formatDateTime } from "@/lib/format";
import type { KeyWithHolder } from "@/services/keys.service";

export type ReturnConfirmModalProps = {
  visible: boolean;
  /** Property code to direct the agent to the correct cabinet slot. */
  propertyCode?: string | null;
  /** Keys being returned — shown as a summary in the modal. */
  returningKeys?: KeyWithHolder[];
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export const ReturnConfirmModal = memo(function ReturnConfirmModal({
  visible,
  propertyCode,
  returningKeys = [],
  isPending,
  onCancel,
  onConfirm,
}: ReturnConfirmModalProps) {
  const handleDismiss = isPending ? undefined : onCancel;
  const returnBy = returningKeys
    .map((k) => k.due_back_at)
    .filter(Boolean)
    .sort()[0] ?? null;
  const hasOverdue = returningKeys.some((k) => k.status === "overdue");

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
          <Text style={styles.title}>Return keys?</Text>
          <Text style={styles.subtitle}>
            Confirm these keys are going back into the cabinet. Place them on the hook
            for this property before confirming.
          </Text>

          <View style={styles.summary}>
            {returningKeys.length > 0 && (
              <>
                <SelectedKeysSummary selectedKeys={returningKeys} />
                <View style={styles.dividerFull} />
              </>
            )}

            <SummaryRow
              icon={
                <Calendar
                  size={15}
                  color={hasOverdue ? theme.colors.danger : theme.colors.primary}
                  strokeWidth={1.8}
                />
              }
              label={hasOverdue ? "Was due" : "Return by"}
              value={returnBy ? formatDateTime(returnBy) : "Return time not set"}
              danger={hasOverdue}
            />

            <View style={styles.divider} />

            <SummaryRow
              icon={
                <Archive
                  size={15}
                  color={theme.colors.primary}
                  strokeWidth={1.8}
                />
              }
              label="Cabinet slot"
              value={propertyCode ?? "Property code unavailable"}
              valueTone={propertyCode ? "primary" : undefined}
            />
          </View>

          <View style={styles.guideBox}>
            <View style={styles.guideHeader}>
              <Archive size={15} color={theme.colors.primary} strokeWidth={1.8} />
              <Text style={styles.guideHeaderText}>Return checklist</Text>
            </View>

            <View style={styles.guideDivider} />

            <View style={styles.guideStepRow}>
              <StepBadge number={1} />
              <Text style={styles.guideStepText}>
                Locate the office key cabinet.
              </Text>
            </View>

            <View style={styles.guideStepRow}>
              <StepBadge number={2} />
              <Text style={styles.guideStepText}>
                Hang the keys on the hook labelled{" "}
                {propertyCode ? (
                  <Text style={styles.codeHighlight}>{propertyCode}</Text>
                ) : (
                  "with this property code"
                )}
                .
              </Text>
            </View>

            <View style={styles.guideStepRow}>
              <StepBadge number={3} />
              <View style={styles.confirmRowInner}>
                <CheckCircle2 size={13} color={theme.colors.success} strokeWidth={2} />
                <Text style={styles.guideStepText}>
                  Tap <Text style={styles.confirmWord}>Confirm return</Text> once the
                  keys are back in place.
                </Text>
              </View>
            </View>
          </View>

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

function SelectedKeysSummary({
  selectedKeys,
}: {
  selectedKeys: KeyWithHolder[];
}) {
  return (
    <View style={styles.keysSection}>
      <View style={styles.keysHeaderRow}>
        <Text style={styles.summaryLabel}>Keys selected</Text>
        <Text style={styles.keysCount}>{selectedKeys.length}</Text>
      </View>
      <View>
        {selectedKeys.map((k) => {
          const Icon = KEY_TYPE_ICON[k.key_type] ?? KeyRound;
          const label =
            k.key_type === "other"
              ? k.label
              : (KEY_TYPE_LABEL[k.key_type] ?? k.key_type);
          return (
            <View key={k.id} style={styles.keyRow}>
              <View style={styles.keyIconCircle}>
                <Icon size={13} color={theme.colors.primary} strokeWidth={1.8} />
              </View>
              <Text style={styles.keyRowLabel} numberOfLines={1}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  danger,
  valueTone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  danger?: boolean;
  valueTone?: "primary";
}) {
  return (
    <View style={styles.summaryRow}>
      <View style={[styles.summaryIcon, danger && styles.summaryIconDanger]}>{icon}</View>
      <View style={styles.summaryTextBlock}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text
          style={[
            styles.summaryValue,
            danger && styles.summaryValueDanger,
            valueTone === "primary" && styles.summaryValuePrimary,
          ]}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

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

function ActionButton({
  label,
  variant,
  disabled,
  loading,
  onPress,
}: ActionButtonProps) {
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

  // ── Summary ───────────────────────────────────────────────────
  summary: {
    width: "100%",
    backgroundColor: theme.colors.surfaceWarm,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: theme.spacing.md,
    overflow: "hidden",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryIconDanger: {
    backgroundColor: theme.colors.dangerSoft,
  },
  summaryTextBlock: {
    flex: 1,
    gap: 2,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text,
  },
  summaryValuePrimary: {
    color: theme.colors.primaryDark,
    fontWeight: "800",
  },
  summaryValueDanger: {
    color: theme.colors.danger,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: theme.spacing.md + 32 + theme.spacing.sm,
  },
  dividerFull: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  keysSection: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    gap: theme.spacing.sm,
  },
  keysHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
    marginLeft: 32 + theme.spacing.sm,
  },
  keysCount: {
    minWidth: 24,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    overflow: "hidden",
    backgroundColor: theme.colors.primarySoft,
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  keyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: 6,
  },
  keyIconCircle: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  keyRowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
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

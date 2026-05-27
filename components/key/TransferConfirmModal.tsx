import { memo } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Calendar, KeyRound, UserCheck } from "lucide-react-native";

import { KEY_TYPE_ICON, KEY_TYPE_LABEL } from "@/components/key/keyLabels";
import { theme } from "@/constants/theme";
import { formatDateTime } from "@/lib/format";
import type { KeyWithHolder } from "@/services/keys.service";

export type TransferConfirmModalProps = {
  visible: boolean;
  /** Name of the agent currently holding the keyset. */
  currentHolderName?: string | null;
  /** Keys being transferred — shown as a summary in the modal. */
  transferringKeys?: KeyWithHolder[];
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export const TransferConfirmModal = memo(function TransferConfirmModal({
  visible,
  currentHolderName,
  transferringKeys = [],
  isPending,
  onCancel,
  onConfirm,
}: TransferConfirmModalProps) {
  const handleDismiss = isPending ? undefined : onCancel;
  const returnBy = transferringKeys
    .map((k) => k.due_back_at)
    .filter(Boolean)
    .sort()[0] ?? null;

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
          <Text style={styles.title}>Transfer keys?</Text>
          <Text style={styles.subtitle}>
            Confirm these keys are being transferred into your custody. You will be
            responsible for returning them when done.
          </Text>

          <View style={styles.summary}>
            {transferringKeys.length > 0 && (
              <>
                <SelectedKeysSummary selectedKeys={transferringKeys} />
                <View style={styles.dividerFull} />
              </>
            )}

            <SummaryRow
              icon={
                <UserCheck
                  size={15}
                  color={theme.colors.primary}
                  strokeWidth={1.8}
                />
              }
              label="Currently with"
              value={currentHolderName ?? "Unknown holder"}
            />

            <View style={styles.divider} />

            <SummaryRow
              icon={
                <Calendar
                  size={15}
                  color={theme.colors.primary}
                  strokeWidth={1.8}
                />
              }
              label="Return by"
              value={returnBy ? formatDateTime(returnBy) : "Return time not set"}
            />
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
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryIcon}>{icon}</View>
      <View style={styles.summaryTextBlock}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summaryValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
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

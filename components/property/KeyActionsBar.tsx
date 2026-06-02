import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ArrowLeftRight, Clock, ClipboardList } from "lucide-react-native";

import { MOVEMENT_CONFIG , theme } from "@/constants";


export type KeyActionsBarProps = {
  isBusy: boolean;
  anyAvailable: boolean;
  anyHeldByMe: boolean;
  anyBorrowedByOther: boolean;
  onCheckout: () => void;
  onReturn: () => void;
  onTransfer: () => void;
  onViewActivity: () => void;
};

export function KeyActionsBar({
  isBusy,
  anyAvailable,
  anyHeldByMe,
  anyBorrowedByOther,
  onCheckout,
  onReturn,
  onTransfer,
  onViewActivity,
}: KeyActionsBarProps) {
  const CheckoutIcon = MOVEMENT_CONFIG.checked_out.Icon;
  const ReturnIcon = MOVEMENT_CONFIG.returned.Icon;
  const ReserveIcon = Clock;
  const TransferIcon = ArrowLeftRight;

  return (
    <View style={styles.card}>
      <View style={[styles.actions, isBusy && styles.actionsBusy]}>
        {isBusy && (
          <View style={styles.busyRow}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.busyText}>Updating...</Text>
          </View>
        )}

        {/* Return — always visible when the user has borrowed/overdue keys here */}
        {anyHeldByMe && (
          <FilledButton
            label="Return"
            icon={<ReturnIcon size={16} color="#fff" strokeWidth={2} />}
            tone="danger"
            onPress={onReturn}
            disabled={isBusy}
          />
        )}

        {/* Checkout + Reserve — visible when selected keys include available ones */}
        {anyAvailable && (
          <>
            <FilledButton
              label="Checkout"
              icon={<CheckoutIcon size={16} color="#fff" strokeWidth={2} />}
              tone="success"
              onPress={onCheckout}
              disabled={isBusy}
            />
            <OutlineButton
              label="Reserve"
              icon={<ReserveIcon size={16} color={theme.colors.primary} strokeWidth={2} />}
              onPress={() =>
                Alert.alert("Reserve keys", "Reservations will be available soon.")
              }
              disabled={isBusy}
            />
          </>
        )}

        {/* Transfer — visible when a currently-borrowed-by-other key is selected */}
        {anyBorrowedByOther && (
          <FilledButton
            label="Transfer to me"
            icon={<TransferIcon size={16} color="#fff" strokeWidth={2} />}
            tone="primary"
            onPress={onTransfer}
            disabled={isBusy}
          />
        )}

        {/* View Activity — always visible */}
        <OutlineButton
          label="View Activity"
          icon={<ClipboardList size={16} color={theme.colors.primary} strokeWidth={2} />}
          onPress={onViewActivity}
          disabled={isBusy}
        />
      </View>
    </View>
  );
}

type BtnProps = {
  label: string;
  icon: ReactNode;
  tone?: "primary" | "success" | "danger";
  onPress?: () => void;
  disabled?: boolean;
};

function FilledButton({ label, icon, tone = "primary", onPress, disabled }: BtnProps) {
  const bg =
    tone === "success" ? styles.bgSuccess
    : tone === "danger" ? styles.bgDanger
    : styles.bgPrimary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        styles.btn, bg,
        pressed && !disabled && styles.pressed,
        disabled && styles.dimmed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
    >
      {icon}
      <Text style={styles.filledLabel}>{label}</Text>
    </Pressable>
  );
}

function OutlineButton({ label, icon, onPress, disabled }: BtnProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        styles.btn, styles.outline,
        pressed && !disabled && styles.pressed,
        disabled && styles.dimmed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
    >
      {icon}
      <Text style={styles.outlineLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
  },
  actions: { gap: 6 },
  actionsBusy: { opacity: 0.55 },
  busyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
  },
  busyText: { fontSize: 13, fontWeight: "500", color: theme.colors.textMuted },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    paddingVertical: 13,
    paddingHorizontal: theme.spacing.md,
  },
  bgPrimary: { backgroundColor: theme.colors.primary },
  bgSuccess: { backgroundColor: theme.colors.success },
  bgDanger: { backgroundColor: theme.colors.danger },
  outline: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  dimmed: { opacity: 0.38 },
  pressed: { opacity: 0.75 },
  filledLabel: { fontSize: 15, fontWeight: "700", color: "#fff" },
  outlineLabel: { fontSize: 15, fontWeight: "600", color: theme.colors.primary },
});

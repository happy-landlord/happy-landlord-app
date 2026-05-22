import { memo, useCallback, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Calendar, ClipboardList, KeyRound } from "lucide-react-native";

import { useCheckoutKeyset, useReturnKeyset, useTransferKeyset } from "@/hooks/useCheckout";
import { theme } from "@/constants/theme";
import { formatUntilTime } from "@/lib/format";
import type { KeySetWithHolder } from "@/services/keys.service";

import { CheckoutConfirmModal } from "./CheckoutConfirmModal";
import { ReturnConfirmModal } from "./ReturnConfirmModal";
import { TransferConfirmModal } from "./TransferConfirmModal";
import { CountdownTimer } from "./CountdownTimer";
import { CHECKOUT_DURATION_HOURS } from "./keysetLabels";
import { resolveKeysetStatus } from "./keysetStatus";

export type CompanyKeySetCardProps = {
  keySet: KeySetWithHolder;
  currentUserId: string;
  /** Property code (e.g. "HL-001") shown in the return cabinet guide. */
  propertyCode?: string | null;
};

const HOUR_MS = 60 * 60 * 1000;
const calcDueBackIso = () =>
  new Date(Date.now() + CHECKOUT_DURATION_HOURS * HOUR_MS).toISOString();

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

/**
 * Action panel for company keysets — provides Check Out / Return / Reserve
 * actions plus a 24-hour countdown timer once checked out by the user.
 *
 * Renders inside the keyset detail page.
 */
export const CompanyKeySetCard = memo(function CompanyKeySetCard({
  keySet,
  currentUserId,
  propertyCode,
}: CompanyKeySetCardProps) {
  const [pendingDueBackAt, setPendingDueBackAt] = useState<string | null>(null);
  // Seed from server data so the timer is visible even after a page reload.
  const [timerEndAt, setTimerEndAt] = useState<string | null>(
    keySet.due_back_at ?? null,
  );
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  const checkout = useCheckoutKeyset(keySet.property_id);
  const returnKey = useReturnKeyset(keySet.property_id);
  const transfer = useTransferKeyset(keySet.property_id);

  // ── Derived state ────────────────────────────────────────────────────────

  const isHeldByMe = keySet.current_holder?.profile_id === currentUserId;
  const viewStatus = resolveKeysetStatus(keySet.status, isHeldByMe);

  const isBusy = checkout.isPending || returnKey.isPending || transfer.isPending;
  const canCheckOut = viewStatus === "available";
  const canReturn =
    viewStatus === "checked_out_by_me" || viewStatus === "overdue";
  const checkedOutByOther = viewStatus === "checked_out_by_other";
  const holderName = keySet.current_holder?.full_name ?? null;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const openCheckoutConfirm = useCallback(() => {
    setPendingDueBackAt(calcDueBackIso());
  }, []);

  const closeCheckoutConfirm = useCallback(() => {
    setPendingDueBackAt(null);
  }, []);

  const confirmCheckOut = useCallback(() => {
    const dueBackAt = pendingDueBackAt ?? calcDueBackIso();
    checkout.mutate(
      { keySetId: keySet.id, dueBackAt },
      {
        onSuccess: () => {
          setTimerEndAt(dueBackAt);
          setPendingDueBackAt(null);
        },
        onError: (err) =>
          Alert.alert(
            "Checkout failed",
            errorMessage(err, "Please try again."),
          ),
      },
    );
  }, [checkout, keySet.id, pendingDueBackAt]);

  const handleReturn = useCallback(() => {
    setReturnModalOpen(true);
  }, []);

  const closeReturnModal = useCallback(() => {
    setReturnModalOpen(false);
  }, []);

  const confirmReturn = useCallback(() => {
    returnKey.mutate(
      { keySetId: keySet.id },
      {
        onSuccess: () => {
          setTimerEndAt(null);
          setReturnModalOpen(false);
        },
        onError: (err) => {
          Alert.alert(
            "Return failed",
            err instanceof Error ? err.message : "Please try again.",
          );
        },
      },
    );
  }, [keySet.id, returnKey]);

  const handleTransfer = useCallback(() => {
    setTransferModalOpen(true);
  }, []);

  const closeTransferModal = useCallback(() => {
    setTransferModalOpen(false);
  }, []);

  const confirmTransfer = useCallback(() => {
    transfer.mutate(
      { keySetId: keySet.id },
      {
        onSuccess: () => {
          setTransferModalOpen(false);
        },
        onError: (err) =>
          Alert.alert(
            "Transfer failed",
            err instanceof Error ? err.message : "Please try again.",
          ),
      },
    );
  }, [keySet.id, transfer]);

  const handleReserve = useCallback(() => {
    Alert.alert("Reserve keyset", "Reservations will be available soon.");
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.card}>
      <View style={[styles.actions, isBusy && styles.actionsBusy]}>
        {isBusy ? (
          <View style={styles.busyRow}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.busyText}>Updating…</Text>
          </View>
        ) : null}

        {checkedOutByOther && holderName ? (
          <View style={styles.holderBadge}>
            <Text style={styles.holderBadgeText}>
              With {holderName}
              {keySet.due_back_at ? ` · until ${formatUntilTime(keySet.due_back_at)}` : ""}
            </Text>
          </View>
        ) : null}

        {canReturn && timerEndAt ? <CountdownTimer endAt={timerEndAt} /> : null}

        {canReturn ? (
          <PrimaryButton
            label="Return"
            icon={<KeyRound size={16} color="#fff" strokeWidth={2} />}
            onPress={handleReturn}
            disabled={isBusy}
            tone="danger"
          />
        ) : checkedOutByOther ? (
          <PrimaryButton
            label="Transfer to me"
            icon={<KeyRound size={16} color="#fff" strokeWidth={2} />}
            onPress={handleTransfer}
            disabled={isBusy}
            tone="primary"
          />
        ) : (
          <PrimaryButton
            label="Checkout"
            icon={<KeyRound size={16} color="#fff" strokeWidth={2} />}
            onPress={canCheckOut ? openCheckoutConfirm : undefined}
            disabled={isBusy || !canCheckOut}
            dimmed={!canCheckOut}
            tone="success"
          />
        )}

        <SecondaryButton
          label="Reserve"
          icon={
            <Calendar size={16} color={theme.colors.primary} strokeWidth={2} />
          }
          onPress={handleReserve}
          disabled={isBusy}
        />

        <SecondaryButton
          label="View Activity"
          icon={
            <ClipboardList
              size={16}
              color={theme.colors.primary}
              strokeWidth={2}
            />
          }
          onPress={() => {}}
          disabled={isBusy}
        />
      </View>

      <CheckoutConfirmModal
        visible={Boolean(pendingDueBackAt)}
        dueBackAt={pendingDueBackAt}
        isPending={checkout.isPending}
        onCancel={closeCheckoutConfirm}
        onConfirm={confirmCheckOut}
      />

      <ReturnConfirmModal
        visible={returnModalOpen}
        propertyCode={propertyCode}
        isPending={returnKey.isPending}
        onCancel={closeReturnModal}
        onConfirm={confirmReturn}
      />

      <TransferConfirmModal
        visible={transferModalOpen}
        currentHolderName={holderName}
        isPending={transfer.isPending}
        onCancel={closeTransferModal}
        onConfirm={confirmTransfer}
      />
    </View>
  );
});

// ─── Local button sub-components ───────────────────────────────────────────

type ButtonProps = {
  label: string;
  icon: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  /** Apply the "unavailable" disabled visual independent of busy state. */
  dimmed?: boolean;
  tone?: "primary" | "success" | "danger";
};

function PrimaryButton({
  label,
  icon,
  onPress,
  disabled,
  dimmed,
  tone = "primary",
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        styles.btn,
        tone === "success"
          ? styles.btnSuccess
          : tone === "danger"
            ? styles.btnDanger
            : styles.btnPrimary,
        dimmed && styles.btnDimmed,
        pressed && !disabled && styles.btnPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
    >
      {icon}
      <Text style={styles.btnPrimaryLabel}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, icon, onPress, disabled }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        styles.btn,
        styles.btnSecondary,
        pressed && !disabled && styles.btnPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
    >
      {icon}
      <Text style={styles.btnSecondaryLabel}>{label}</Text>
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
    gap: theme.spacing.sm,
  },
  holderBadge: {
    backgroundColor: theme.colors.neutralSoft,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
    alignSelf: "center",
  },
  holderBadgeText: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.colors.textMuted,
    textAlign: "center",
  },
  actions: {
    gap: 6,
  },
  actionsBusy: {
    opacity: 0.55,
  },
  busyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
  },
  busyText: {
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.textMuted,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    paddingVertical: 13,
    paddingHorizontal: theme.spacing.md,
  },
  btnPrimary: {
    backgroundColor: theme.colors.primary,
  },
  btnSuccess: {
    backgroundColor: theme.colors.success,
  },
  btnDanger: {
    backgroundColor: theme.colors.danger,
  },
  btnSecondary: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  btnDimmed: {
    opacity: 0.38,
  },
  btnPressed: {
    opacity: 0.75,
  },
  btnPrimaryLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  btnSecondaryLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.primary,
  },
});

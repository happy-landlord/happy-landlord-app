import { useCallback } from "react";
import { Alert } from "react-native";

import {
  useCheckoutKeySet,
  useExtendKeySet,
  useKeySets,
  useReportKeySetLost,
  useReturnKeySet,
  useTransferKeySet,
  useUndoReportKeySetLost,
} from "@/lib/hooks";
import { alertError, isoInDays, isPastDue } from "@/lib/utils";
import type { KeySetWithDetails } from "@/lib/services";


// ── Public types ─────────────────────────────────────────────────────────────
export type KeySetActions = {
  // pending flags
  isBusy: boolean;
  isCheckoutPending: boolean;
  isReturnPending: boolean;
  isTransferPending: boolean;
  isExtendPending: boolean;
  isUndoLostPending: boolean;

  // derived state
  isAvailable: boolean;
  isHeldByMe: boolean;
  isHeldByOther: boolean;
  isMissingDamaged: boolean;
  overdue: boolean;

  // visibility flags (single source of truth for which buttons appear)
  showAdminReturn: boolean;
  showAgentCheckout: boolean;
  showAgentReturn: boolean;
  showAgentExtend: boolean;
  showAgentReportLost: boolean;
  showAgentTransfer: boolean;
  showUndoLost: boolean;
  hasActions: boolean;

  // bound handlers — pass an onClose to dismiss the originating modal on success
  checkout: (days: number, onClose: () => void) => void;
  transfer: (onClose: () => void) => void;
  extend: (days: number, onClose: () => void) => void;
  adminReturn: (onClose: () => void) => void;
  reportLost: () => void;
  undoLost: () => void;
};

/**
 * Consolidates all keyset-detail screen logic: mutations, role-aware derived
 * state, button-visibility decisions and the (slightly involved) error /
 * confirm handlers. The screen becomes purely presentational.
 *
 * The "do I already have another checkout in this property?" check is also
 * owned here so the screen doesn't have to know about peer keysets.
 */
export function useKeySetActions({
  keySet,
  currentUserId,
  isAdmin,
}: {
  keySet: KeySetWithDetails | null | undefined;
  currentUserId: string | undefined;
  isAdmin: boolean;
}): KeySetActions {
  const propertyId = keySet?.property_id ?? "";

  // Peer keysets (only relevant for agents). useKeySets is gated on a
  // non-empty propertyId, so this is a no-op until the keyset loads.
  const { data: propertySets } = useKeySets(propertyId);
  const myPropertyCheckout =
    !isAdmin && keySet && currentUserId
      ? (propertySets ?? []).find(
          (ks) =>
            ks.id !== keySet.id &&
            (ks.status === "checked_out" || ks.status === "overdue") &&
            ks.current_holder?.profile_id === currentUserId,
        )
      : undefined;

  // ── Mutations ──────────────────────────────────────────────────────────
  const checkoutMut = useCheckoutKeySet(propertyId);
  const returnMut = useReturnKeySet(propertyId);
  const transferMut = useTransferKeySet(propertyId);
  const extendMut = useExtendKeySet(propertyId);
  const reportLostMut = useReportKeySetLost(propertyId);
  const undoLostMut = useUndoReportKeySetLost(propertyId);

  const isBusy =
    checkoutMut.isPending ||
    returnMut.isPending ||
    transferMut.isPending ||
    extendMut.isPending ||
    reportLostMut.isPending ||
    undoLostMut.isPending;

  // ── Derived state ──────────────────────────────────────────────────────
  const status = keySet?.status;
  const holderProfileId = keySet?.current_holder?.profile_id;

  const isHeldByMe =
    (status === "checked_out" || status === "overdue") &&
    holderProfileId === currentUserId;
  const isHeldByOther =
    (status === "checked_out" || status === "overdue") &&
    holderProfileId !== currentUserId;
  const overdue =
    status === "overdue" ||
    (keySet?.due_back_at ? isPastDue(keySet.due_back_at) : false);
  const isAvailable = status === "available";
  const isMissingDamaged = status === "missing_damaged";

  // ── Visibility ─────────────────────────────────────────────────────────
  const showAdminReturn = isAdmin && (isHeldByMe || isHeldByOther);
  const showAgentCheckout =
    !isAdmin && isAvailable && !myPropertyCheckout && !isHeldByMe;
  const showAgentReturn = !isAdmin && isHeldByMe;
  const showAgentExtend = !isAdmin && isHeldByMe;
  const showAgentReportLost = !isAdmin && isHeldByMe;
  const showAgentTransfer = !isAdmin && isHeldByOther;
  const showUndoLost =
    isMissingDamaged && (isAdmin || holderProfileId === currentUserId);

  const hasActions =
    showAdminReturn ||
    showAgentCheckout ||
    showAgentReturn ||
    showAgentExtend ||
    showAgentReportLost ||
    showAgentTransfer ||
    showUndoLost;

  // ── Handlers ───────────────────────────────────────────────────────────
  const checkout = useCallback(
    (days: number, onClose: () => void) => {
      if (!keySet) return;
      checkoutMut.mutate(
        { keySetId: keySet.id, dueBackAt: isoInDays(days) },
        {
          onSuccess: onClose,
          onError: (err) => alertError("Checkout failed", err),
        },
      );
    },
    [checkoutMut, keySet],
  );

  const transfer = useCallback(
    (onClose: () => void) => {
      if (!keySet) return;
      transferMut.mutate(
        { keySetId: keySet.id },
        {
          onSuccess: onClose,
          onError: (err) => alertError("Transfer failed", err),
        },
      );
    },
    [keySet, transferMut],
  );

  const extend = useCallback(
    (days: number, onClose: () => void) => {
      if (!keySet) return;
      const newDueBack = isoInDays(
        days,
        keySet.due_back_at ? new Date(keySet.due_back_at) : Date.now(),
      );
      extendMut.mutate(
        { keySetId: keySet.id, dueBackAt: newDueBack },
        {
          onSuccess: onClose,
          onError: (err) => alertError("Extend failed", err),
        },
      );
    },
    [extendMut, keySet],
  );

  const adminReturn = useCallback(
    (onClose: () => void) => {
      if (!keySet) return;
      returnMut.mutate(
        { keySetId: keySet.id },
        {
          onSuccess: onClose,
          onError: (err) => alertError("Failed", err),
        },
      );
    },
    [keySet, returnMut],
  );

  const reportLost = useCallback(() => {
    if (!keySet) return;
    Alert.alert(
      "Report as lost?",
      "This will mark the keyset as missing or damaged. This action cannot be undone easily.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Report Lost",
          style: "destructive",
          onPress: () =>
            reportLostMut.mutate(keySet.id, {
              onError: (err) => alertError("Failed", err),
            }),
        },
      ],
    );
  }, [keySet, reportLostMut]);

  const undoLost = useCallback(() => {
    if (!keySet) return;
    undoLostMut.mutate(keySet.id, {
      onError: (err) => alertError("Failed", err),
    });
  }, [keySet, undoLostMut]);

  return {
    isBusy,
    isCheckoutPending: checkoutMut.isPending,
    isReturnPending: returnMut.isPending,
    isTransferPending: transferMut.isPending,
    isExtendPending: extendMut.isPending,
    isUndoLostPending: undoLostMut.isPending,
    isAvailable,
    isHeldByMe,
    isHeldByOther,
    isMissingDamaged,
    overdue,
    showAdminReturn,
    showAgentCheckout,
    showAgentReturn,
    showAgentExtend,
    showAgentReportLost,
    showAgentTransfer,
    showUndoLost,
    hasActions,
    checkout,
    transfer,
    extend,
    adminReturn,
    reportLost,
    undoLost,
  };
}

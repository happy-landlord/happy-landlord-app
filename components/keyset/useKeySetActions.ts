import { useCallback } from "react";

import {
  useCheckoutKeySet,
  useExtendKeySet,
  useKeySets,
  useReportKeySetLost,
  useReturnKeySet,
  useTransferKeySet,
  useUndoReportKeySetLost,
  useReserveKeySet,
  useCancelReservation,
} from "@/lib/hooks";
import { alertError, isoInDays, isPastDue } from "@/lib/utils";
import type { KeySetWithDetails } from "@/lib/services";
import type { KeysetAvailability } from "@/lib/utils";

// ── Public types ─────────────────────────────────────────────────────────────
export type KeySetActions = {
  // pending flags
  isBusy: boolean;
  isCheckoutPending: boolean;
  isReturnPending: boolean;
  isTransferPending: boolean;
  isExtendPending: boolean;
  isReportLostPending: boolean;
  isUndoLostPending: boolean;
  isReservePending: boolean;
  isCancelReservationPending: boolean;

  // derived state
  isAvailable: boolean;
  isHeldByMe: boolean;
  isHeldByOther: boolean;
  isMissingDamaged: boolean;
  overdue: boolean;

  // visibility flags (single source of truth for which buttons appear)
  showAdminReturn: boolean;
  showAgentCheckout: boolean;
  showAgentReserve: boolean;
  showAgentCancelReservation: boolean;
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
  reportLost: (onClose: () => void) => void;
  undoLost: () => void;
  reserve: (startsAt: string, endsAt: string, notes: string | null, onClose: () => void) => void;
  cancelReservation: (reservationId: string, onClose: () => void) => void;
};

export function useKeySetActions({
  keySet,
  currentUserId,
  isAdmin,
  availability,
}: {
  keySet: KeySetWithDetails | null | undefined;
  currentUserId: string | undefined;
  isAdmin: boolean;
  /** Optional availability descriptor computed from reservations. */
  availability?: KeysetAvailability;
}): KeySetActions {
  const propertyId = keySet?.property_id ?? "";
  const keySetId = keySet?.id ?? "";

  // Peer keysets (only relevant for agents)
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
  const reserveMut = useReserveKeySet(propertyId, keySetId);
  const cancelReservationMut = useCancelReservation(propertyId, keySetId);

  const isBusy =
    checkoutMut.isPending ||
    returnMut.isPending ||
    transferMut.isPending ||
    extendMut.isPending ||
    reportLostMut.isPending ||
    undoLostMut.isPending ||
    reserveMut.isPending ||
    cancelReservationMut.isPending;

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

  // Reservation-aware checkout / reserve visibility
  const canCheckout = availability ? availability.canCheckout : isAvailable;
  const canReserve = availability ? availability.canReserve : isAvailable;
  const canCancelReservation = availability?.canCancelReservation ?? false;

  // ── Visibility ─────────────────────────────────────────────────────────
  const showAdminReturn = isAdmin && (isHeldByMe || isHeldByOther);
  const showAgentCheckout =
    !isAdmin && canCheckout && !myPropertyCheckout && !isHeldByMe;
  const showAgentReserve =
    !isAdmin && canReserve && !myPropertyCheckout && !isHeldByMe;
  const showAgentCancelReservation = !isAdmin && canCancelReservation;
  const showAgentReturn = !isAdmin && isHeldByMe;
  const showAgentExtend = !isAdmin && isHeldByMe;
  const showAgentReportLost = !isAdmin && isHeldByMe;
  const showAgentTransfer = !isAdmin && isHeldByOther;
  const showUndoLost =
    isMissingDamaged && (isAdmin || holderProfileId === currentUserId);

  const hasActions =
    showAdminReturn ||
    showAgentCheckout ||
    showAgentReserve ||
    showAgentCancelReservation ||
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

  const reportLost = useCallback(
    (onClose: () => void) => {
      if (!keySet) return;
      reportLostMut.mutate(keySet.id, {
        onSuccess: onClose,
        onError: (err) => alertError("Failed", err),
      });
    },
    [keySet, reportLostMut],
  );

  const undoLost = useCallback(() => {
    if (!keySet) return;
    undoLostMut.mutate(keySet.id, {
      onError: (err) => alertError("Failed", err),
    });
  }, [keySet, undoLostMut]);

  const reserve = useCallback(
    (startsAt: string, endsAt: string, notes: string | null, onClose: () => void) => {
      if (!keySet) return;
      reserveMut.mutate(
        { keySetId: keySet.id, startsAt, endsAt, notes },
        {
          onSuccess: onClose,
          onError: (err) => alertError("Reservation failed", err),
        },
      );
    },
    [keySet, reserveMut],
  );

  const cancelReservation = useCallback(
    (reservationId: string, onClose: () => void) => {
      if (!keySet) return;
      cancelReservationMut.mutate(reservationId, {
        onSuccess: onClose,
        onError: (err) => alertError("Cancellation failed", err),
      });
    },
    [keySet, cancelReservationMut],
  );

  return {
    isBusy,
    isCheckoutPending: checkoutMut.isPending,
    isReturnPending: returnMut.isPending,
    isTransferPending: transferMut.isPending,
    isExtendPending: extendMut.isPending,
    isReportLostPending: reportLostMut.isPending,
    isUndoLostPending: undoLostMut.isPending,
    isReservePending: reserveMut.isPending,
    isCancelReservationPending: cancelReservationMut.isPending,
    isAvailable,
    isHeldByMe,
    isHeldByOther,
    isMissingDamaged,
    overdue,
    showAdminReturn,
    showAgentCheckout,
    showAgentReserve,
    showAgentCancelReservation,
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
    reserve,
    cancelReservation,
  };
}


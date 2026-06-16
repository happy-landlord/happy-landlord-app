import { useCurrentUserId, useKeySet, useProperty } from "@/lib/hooks";
import { useRole } from "@/hooks";
import { DURATION_DAYS } from "@/constants";
import { getAllowedCheckoutDays } from "@/lib/utils";

import { useKeySetScreen } from "@/components/keyset/detail/KeySetScreenContext";
import { useKeySetActions } from "@/components/keyset/detail/useKeySetActions";
import { useKeysetAvailability } from "@/components/keyset/useKeysetAvailability";

import { KeySetDurationModal } from "./KeySetDurationModal";
import { ReportLostSheet } from "./ReportLostSheet";
import { ReserveKeySetModal } from "./ReserveKeySetModal";
import { ReturnConfirmModal } from "./ReturnConfirmModal";
import { TransferConfirmModal } from "@/components/keyset/modals/TransferConfirmModal";
import { UndoReportLostSheet } from "./UndoReportLostSheet";

// ── KeySetModals ─────────────────────────────────────────────────────────────
// Single home for every keyset-action modal mounted on the detail screen.
// Picks the right modal off the discriminated-union modal state in
// `KeySetScreenContext` and wires it to the shared `useKeySetActions` hook,
// so the parent screen no longer juggles 9 booleans + 11 callbacks.

export function KeySetModals() {
  const { keySetId, modal, closeModal, setModalDays } = useKeySetScreen();
  const { data: keySet } = useKeySet(keySetId);
  const { data: property } = useProperty(keySet?.property_id ?? "");
  const currentUserId = useCurrentUserId();
  const { isAdmin } = useRole();
  const availability = useKeysetAvailability(keySetId);
  const actions = useKeySetActions({
    keySet,
    currentUserId,
    isAdmin,
    availability,
  });

  if (!keySet) return null;

  const allowedCheckoutDays = getAllowedCheckoutDays(availability);
  const isCheckoutConstrained =
    allowedCheckoutDays.length < DURATION_DAYS.length;

  // Clamp selected days to the largest allowed option so the modal never
  // shows a selection that exceeds the reservation boundary.
  const rawCheckoutDays = modal.kind === "checkout" ? modal.days : 1;
  const checkoutDays = allowedCheckoutDays.includes(rawCheckoutDays)
    ? rawCheckoutDays
    : (allowedCheckoutDays[allowedCheckoutDays.length - 1] ?? 1);

  return (
    <>
      {/* Checkout */}
      <KeySetDurationModal
        visible={modal.kind === "checkout"}
        title={`Checkout ${keySet.name}`}
        subtitle={
          isCheckoutConstrained
            ? "Duration limited by an upcoming reservation."
            : "Select how long you need the keyset."
        }
        keys={keySet.keys ?? []}
        durationDays={checkoutDays}
        allowedDays={allowedCheckoutDays}
        baseIso={undefined}
        isPending={actions.isCheckoutPending}
        onDurationChange={setModalDays}
        onCancel={closeModal}
        onConfirm={() => actions.checkout(checkoutDays, closeModal)}
        confirmLabel="Confirm"
      />

      {/* Extend */}
      <KeySetDurationModal
        visible={modal.kind === "extend"}
        title={`Extend ${keySet.name}`}
        subtitle="Add more days from the current due date."
        durationDays={modal.kind === "extend" ? modal.days : 1}
        baseIso={keySet.due_back_at ?? undefined}
        isPending={actions.isExtendPending}
        onDurationChange={setModalDays}
        onCancel={closeModal}
        onConfirm={() =>
          actions.extend(modal.kind === "extend" ? modal.days : 1, closeModal)
        }
        confirmLabel="Extend"
        confirmTone="primary"
      />

      {/* Reserve */}
      <ReserveKeySetModal
        visible={modal.kind === "reserve"}
        keySetName={keySet.name}
        isPending={actions.isReservePending}
        onClose={closeModal}
        onConfirm={(startsAt, endsAt, notes) =>
          actions.reserve(
            startsAt.toISOString(),
            endsAt.toISOString(),
            notes || null,
            closeModal,
          )
        }
      />

      {/* Admin: return confirm */}
      <ReturnConfirmModal
        visible={modal.kind === "return"}
        keySetName={keySet.name}
        cabinetCode={property?.cabinet_code ?? null}
        holderName={keySet.current_holder?.full_name ?? null}
        returningKeys={keySet.keys ?? []}
        dueBackAt={keySet.due_back_at ?? null}
        isPending={actions.isReturnPending}
        onCancel={closeModal}
        onConfirm={() => actions.adminReturn(closeModal)}
      />

      {/* Agent: transfer */}
      <TransferConfirmModal
        visible={modal.kind === "transfer"}
        keySetName={keySet.name}
        currentHolderName={keySet.current_holder?.full_name ?? null}
        dueBackAt={keySet.due_back_at ?? null}
        isPending={actions.isTransferPending}
        onCancel={closeModal}
        onConfirm={() => actions.transfer(closeModal)}
      />

      {/* Agent: report lost */}
      <ReportLostSheet
        visible={modal.kind === "reportLost"}
        keySetName={keySet.name}
        isPending={actions.isReportLostPending}
        onCancel={closeModal}
        onConfirm={() => actions.reportLost(closeModal)}
      />

      {/* Admin / agent: undo missing-damaged */}
      <UndoReportLostSheet
        visible={modal.kind === "undoLost"}
        keySetName={keySet.name}
        keys={keySet.keys ?? []}
        markedByName={keySet.current_holder?.full_name ?? null}
        cabinetCode={property?.cabinet_code ?? null}
        isPending={actions.isUndoLostPending}
        onCancel={closeModal}
        onConfirm={(notes) => actions.undoLost(notes, closeModal)}
      />
    </>
  );
}

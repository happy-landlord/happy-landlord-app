import { useKeySetScreen } from "./KeySetScreenContext";
import { KeySetDurationModal } from "./KeySetDurationModal";
import { KeySetEditSheet } from "./KeySetEditSheet";
import { ReportLostSheet } from "./ReportLostSheet";
import { ReserveKeySetModal } from "./ReserveKeySetModal";
import { ReturnConfirmModal } from "./ReturnConfirmModal";
import { TransferConfirmModal } from "./TransferConfirmModal";
import {
  useCurrentUserId,
  useKeySet,
  useProperty,
} from "@/lib/hooks";
import { useKeySetActions, useKeysetAvailability, useRole } from "@/hooks";

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

  return (
    <>
      {/* Checkout */}
      <KeySetDurationModal
        visible={modal.kind === "checkout"}
        title={`Checkout ${keySet.name}`}
        subtitle="Select how long you need the keyset."
        keys={keySet.keys ?? []}
        durationDays={modal.kind === "checkout" ? modal.days : 1}
        baseIso={undefined}
        isPending={actions.isCheckoutPending}
        onDurationChange={setModalDays}
        onCancel={closeModal}
        onConfirm={() =>
          actions.checkout(
            modal.kind === "checkout" ? modal.days : 1,
            closeModal,
          )
        }
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

      {/* Admin: edit keys */}
      {isAdmin && (
        <KeySetEditSheet
          visible={modal.kind === "editKeys"}
          onClose={closeModal}
          propertyId={keySet.property_id}
          keySetId={keySet.id}
          keySetName={keySet.name}
          keys={keySet.keys ?? []}
        />
      )}

      {/* Admin: return confirm */}
      <ReturnConfirmModal
        visible={modal.kind === "return"}
        keySetName={keySet.name}
        propertyCode={property?.property_code ?? null}
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
    </>
  );
}


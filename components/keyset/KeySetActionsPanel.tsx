import { Alert, StyleSheet, Text, View } from "react-native";
import { CalendarClock, CalendarX } from "lucide-react-native";

import { CountdownTimer } from "./CountdownTimer";
import { useKeySetScreen } from "./KeySetScreenContext";
import { Button } from "@/components/ui";
import { theme } from "@/constants";
import { useCurrentUserId, useKeySet } from "@/lib/hooks";
import { useRole } from "@/hooks";
import { useKeySetActions } from "./useKeySetActions";
import { useKeysetAvailability } from "./useKeysetAvailability";
import { formatDueAt } from "@/lib/utils";

// ── KeySetActionsPanel ───────────────────────────────────────────────────────
// Self-contained action button stack for the keyset detail screen.
// Reads keyset, role, availability, and actions from hooks; opens modals via
// the screen context. The parent screen mounts it with zero props.

export function KeySetActionsPanel() {
  const { keySetId, openModal } = useKeySetScreen();
  const { data: keySet } = useKeySet(keySetId);
  const currentUserId = useCurrentUserId();
  const { isAdmin } = useRole();
  const availability = useKeysetAvailability(keySetId);
  const actions = useKeySetActions({
    keySet,
    currentUserId,
    isAdmin,
    availability,
  });

  const dueBackAt = keySet?.due_back_at;

  const {
    overdue,
    isHeldByMe,
    isHeldByOther,
    isMissingDamaged,
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
    isBusy,
  } = actions;

  if (!hasActions) return null;

  const showDueSummary =
    isAdmin &&
    !!dueBackAt &&
    !isMissingDamaged &&
    (isHeldByMe || isHeldByOther || showAdminReturn);

  // The reservation to cancel is whichever active/upcoming reservation belongs to me
  const myReservation = (() => {
    if (!availability) return undefined;
    if (
      availability.activeReservation?.reserved_by?.profile_id === currentUserId
    ) {
      return availability.activeReservation;
    }
    if (
      availability.nextReservation?.reserved_by?.profile_id === currentUserId
    ) {
      return availability.nextReservation;
    }
    return undefined;
  })();

  const handleCancelReservation = () => {
    if (!myReservation) return;
    Alert.alert(
      "Cancel reservation?",
      "Your reservation will be cancelled and the keyset will be available again.",
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel Reservation",
          style: "destructive",
          onPress: () => actions.cancelReservation(myReservation.id, () => {}),
        },
      ],
    );
  };

  return (
    <View style={styles.section}>
      {showDueSummary && dueBackAt && (
        <View style={[styles.dueRow, overdue && styles.dueRowOverdue]}>
          <CalendarClock
            size={14}
            color={overdue ? theme.colors.danger : theme.colors.warning}
            strokeWidth={2}
          />
          <Text style={[styles.dueText, overdue && styles.dueTextOverdue]}>
            {overdue ? "Was due" : "Due"}{" "}
            <Text style={styles.dueDate}>{formatDueAt(dueBackAt)}</Text>
          </Text>
        </View>
      )}

      {showAdminReturn && (
        <Button
          title="Mark as Returned"
          variant="danger"
          disabled={isBusy}
          onPress={() => openModal({ kind: "return" })}
        />
      )}

      {showAgentReturn && dueBackAt && !overdue && (
        <CountdownTimer endAt={dueBackAt} />
      )}

      {showAgentReturn && dueBackAt && overdue && (
        <View style={[styles.dueRow, styles.dueRowNeutral]}>
          <CalendarX size={14} color={theme.colors.textMuted} strokeWidth={2} />
          <Text style={[styles.dueText, styles.dueTextNeutral]}>
            Was due <Text style={styles.dueDate}>{formatDueAt(dueBackAt)}</Text>
          </Text>
        </View>
      )}

      {showAgentCheckout && (
        <Button
          title="Checkout Keyset"
          variant="success"
          disabled={isBusy}
          onPress={() => openModal({ kind: "checkout", days: 1 })}
        />
      )}

      {showAgentReserve && (
        <Button
          title="Reserve"
          variant="successOutline"
          disabled={isBusy}
          onPress={() => openModal({ kind: "reserve" })}
        />
      )}

      {showAgentCancelReservation && (
        <View style={styles.cancelRow}>
          <CalendarX size={14} color={theme.colors.warning} strokeWidth={2} />
          <Text style={styles.cancelLabel}>You have a reservation</Text>
          <Button
            title="Cancel"
            variant="dangerOutline"
            disabled={isBusy}
            onPress={handleCancelReservation}
            style={styles.cancelBtn}
          />
        </View>
      )}

      {showAgentExtend && (
        <Button
          title="Extend Duration"
          variant="primary"
          disabled={isBusy}
          onPress={() => openModal({ kind: "extend", days: 1 })}
        />
      )}

      {showAgentReportLost && (
        <Button
          title="Report Lost"
          variant="dangerOutline"
          disabled={isBusy}
          onPress={() => openModal({ kind: "reportLost" })}
        />
      )}

      {showAgentTransfer && (
        <Button
          title={isBusy ? "Transferring…" : "Transfer to Me"}
          variant="primary"
          disabled={isBusy}
          onPress={() => openModal({ kind: "transfer" })}
        />
      )}

      {showUndoLost && (
        <Button
          title={actions.isUndoLostPending ? "Undoing…" : "Undo Lost Report"}
          variant="successOutline"
          disabled={isBusy}
          onPress={actions.undoLost}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: theme.spacing.sm },
  dueRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 7,
    backgroundColor: theme.colors.warningSoft,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dueRowOverdue: { backgroundColor: theme.colors.dangerSoft },
  dueRowNeutral: { backgroundColor: theme.colors.neutralSoft },
  dueText: { fontSize: 13, color: theme.colors.warning },
  dueTextOverdue: { color: theme.colors.danger },
  dueTextNeutral: { color: theme.colors.textMuted },
  dueDate: { fontWeight: "700" },
  cancelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.colors.warningSoft,
    borderRadius: theme.radius.md,
    paddingLeft: 12,
    paddingVertical: 6,
    paddingRight: 6,
  },
  cancelLabel: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.warning,
    fontWeight: "600",
  },
  cancelBtn: {
    minHeight: 36,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
  },
});

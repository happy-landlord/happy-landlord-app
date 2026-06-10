import { Alert, StyleSheet, Text, View } from "react-native";
import { CalendarClock, CalendarX, UserRound } from "lucide-react-native";

import { CountdownTimer } from "./CountdownTimer";
import { useKeySetScreen } from "./KeySetScreenContext";
import { Button, SectionHeader } from "@/components/ui";
import { theme } from "@/constants";
import {
  useCurrentUserId,
  useKeySet,
  useKeySetReservations,
} from "@/lib/hooks";
import { useRole } from "@/hooks";
import { useKeySetActions } from "./useKeySetActions";
import { useKeysetAvailability } from "@/components/keyset/useKeysetAvailability";
import { formatDueAt, formatShortDate } from "@/lib/utils";
import type { Reservation } from "@/lib/services/reservations.service";

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
  const { data: allReservations = [] } = useKeySetReservations(keySetId);
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

  if (!hasActions && !(isAdmin && allReservations.length > 0)) return null;

  const showDueSummary =
    isAdmin &&
    !!dueBackAt &&
    !isMissingDamaged &&
    (isHeldByMe || isHeldByOther || showAdminReturn);

  // The reservation to cancel is whichever active/upcoming reservation belongs to me.
  // `availability.myReservation` already resolves the correct one (even when it's
  // not the earliest upcoming reservation on the keyset).
  const myReservation = availability?.myReservation;

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

      {/* Admin: one cancel card per active reservation */}
      {isAdmin && allReservations.length > 0 && (
        <>
          <SectionHeader title="Reservations" />
          {allReservations.map((res) => (
            <AdminReservationCard
              key={res.id}
              reservation={res}
              isBusy={isBusy}
              onCancel={() => actions.cancelReservation(res.id, () => {})}
            />
          ))}
        </>
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

      {showAgentCancelReservation && myReservation && (
        <View style={styles.reservationRow}>
          <CalendarClock
            size={14}
            color={theme.colors.warning}
            strokeWidth={2}
          />
          <Text style={styles.reservationText}>
            Reserved{" "}
            <Text style={styles.reservationDate}>
              {formatShortDate(myReservation.starts_at)}
            </Text>
            {" → "}
            <Text style={styles.reservationDate}>
              {formatShortDate(myReservation.ends_at)}
            </Text>
          </Text>
        </View>
      )}

      {showAgentCancelReservation && (
        <Button
          title="Cancel Reservation"
          variant="warningOutline"
          disabled={isBusy}
          onPress={handleCancelReservation}
        />
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

// ── AdminReservationCard ──────────────────────────────────────────────────────

function AdminReservationCard({
  reservation,
  isBusy,
  onCancel,
}: {
  reservation: Reservation;
  isBusy: boolean;
  onCancel: () => void;
}) {
  const name = reservation.reserved_by?.full_name ?? "Unknown agent";

  const handleCancel = () => {
    Alert.alert(
      "Cancel reservation?",
      `Cancel ${name}'s reservation? The keyset will become available again.`,
      [
        { text: "Keep", style: "cancel" },
        { text: "Cancel Reservation", style: "destructive", onPress: onCancel },
      ],
    );
  };

  return (
    <View style={styles.resCard}>
      <View style={styles.resCardHeader}>
        <View style={styles.resCardIcon}>
          <CalendarClock
            size={14}
            color={theme.colors.warning}
            strokeWidth={2}
          />
        </View>
        <View style={styles.resCardInfo}>
          <View style={styles.resCardNameRow}>
            <UserRound
              size={12}
              color={theme.colors.textMuted}
              strokeWidth={2}
            />
            <Text style={styles.resCardName} numberOfLines={1}>
              {name}
            </Text>
          </View>
          <Text style={styles.resCardDates}>
            {formatShortDate(reservation.starts_at)}
            {" → "}
            {formatShortDate(reservation.ends_at)}
          </Text>
          {reservation.notes ? (
            <Text style={styles.resCardNotes} numberOfLines={2}>
              {reservation.notes}
            </Text>
          ) : null}
        </View>
        <Button
          title="Cancel"
          variant="dangerOutline"
          disabled={isBusy}
          onPress={handleCancel}
          style={styles.resCardBtn}
        />
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
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
  reservationRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 7,
    backgroundColor: theme.colors.warningSoft,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  reservationText: { fontSize: 13, color: theme.colors.warning },
  reservationDate: { fontWeight: "700" },

  // Admin reservation card
  resCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
  },
  resCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  resCardIcon: {
    width: 28,
    height: 28,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.warningSoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  resCardInfo: { flex: 1, gap: 2 },
  resCardNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  resCardName: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.text,
    flex: 1,
  },
  resCardDates: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.warning,
  },
  resCardNotes: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontStyle: "italic",
  },
  resCardBtn: {
    minHeight: 34,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexShrink: 0,
  },
});

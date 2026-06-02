import { StyleSheet, Text, View } from "react-native";
import { CalendarClock } from "lucide-react-native";

import { CountdownTimer } from "./CountdownTimer";
import { Button } from "@/components/ui";
import { theme } from "@/constants";
import { formatDueAt } from "@/lib/utils";
import type { KeySetActions } from "@/hooks";

// ── KeySetActionsPanel ───────────────────────────────────────────────────────
// Renders the action buttons (and admin-only due summary / agent countdown)
// for the keyset detail screen. Visibility and pending flags come from
// `useKeySetActions`, so this component is purely presentational — the screen
// owns the modals that the button presses open.

export type KeySetActionsPanelProps = {
  actions: KeySetActions;
  isAdmin: boolean;
  dueBackAt: string | null | undefined;
  onAdminReturnPress: () => void;
  onCheckoutPress: () => void;
  onExtendPress: () => void;
  onTransferPress: () => void;
};

export function KeySetActionsPanel({
  actions,
  isAdmin,
  dueBackAt,
  onAdminReturnPress,
  onCheckoutPress,
  onExtendPress,
  onTransferPress,
}: KeySetActionsPanelProps) {
  const {
    overdue,
    isHeldByMe,
    isHeldByOther,
    isMissingDamaged,
    showAdminReturn,
    showAgentCheckout,
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
          onPress={onAdminReturnPress}
        />
      )}

      {showAgentReturn && dueBackAt && <CountdownTimer endAt={dueBackAt} />}

      {showAgentCheckout && (
        <Button
          title="Checkout Keyset"
          variant="success"
          disabled={isBusy}
          onPress={onCheckoutPress}
        />
      )}

      {showAgentCheckout && (
        <Button
          title="Reserve"
          variant="successOutline"
          disabled={isBusy}
          onPress={() => {}}
        />
      )}

      {showAgentExtend && (
        <Button
          title="Extend Duration"
          variant="primary"
          disabled={isBusy}
          onPress={onExtendPress}
        />
      )}

      {showAgentReportLost && (
        <Button
          title="Report Lost"
          variant="dangerOutline"
          disabled={isBusy}
          onPress={actions.reportLost}
        />
      )}

      {showAgentTransfer && (
        <Button
          title={isBusy ? "Transferring…" : "Transfer to Me"}
          variant="primary"
          disabled={isBusy}
          onPress={onTransferPress}
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
  dueText: { fontSize: 13, color: theme.colors.warning },
  dueTextOverdue: { color: theme.colors.danger },
  dueDate: { fontWeight: "700" },
});

import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Calendar, TriangleAlert, UserCheck } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { ConfirmSheet } from "@/components/ui";
import { SelectedKeysSummary } from "./SelectedKeysSummary";
import { SummaryRow, summaryStyles } from "./KeySetSummaryRow";
import { formatDateTime, isPastDue } from "@/lib/utils";
import { theme } from "@/constants";
import type { KeyInSet } from "@/lib/services";

export type TransferConfirmModalProps = {
  visible: boolean;
  /** Name of the keyset being transferred — shown in the sheet title. */
  keySetName: string;
  /** Name of the agent currently holding the keyset. */
  currentHolderName?: string | null;
  /** Keys being transferred — shown as a summary in the modal. */
  transferringKeys?: KeyInSet[];
  /** Explicit due-back date — used when transferringKeys is not available (e.g. keyset flow). */
  dueBackAt?: string | null;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export const TransferConfirmModal = memo(function TransferConfirmModal({
  visible,
  keySetName,
  currentHolderName,
  transferringKeys = [],
  dueBackAt,
  isPending,
  onCancel,
  onConfirm,
}: TransferConfirmModalProps) {
  const isOverdue = !!dueBackAt && isPastDue(dueBackAt);
  return (
    <ConfirmSheet
      visible={visible}
      title={`Transfer ${keySetName}`}
      subtitle="Confirm these keys are being transferred into your custody. You will be responsible for returning them when done."
      confirmLabel={isPending ? "Transferring…" : "Transfer to me"}
      confirmTone="primary"
      isPending={isPending}
      onCancel={onCancel}
      onConfirm={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        onConfirm();
      }}
    >
      <View style={summaryStyles.card}>
        {transferringKeys.length > 0 && (
          <>
            <View style={summaryStyles.cardPadded}>
              <SelectedKeysSummary keys={transferringKeys} />
            </View>
            <View style={summaryStyles.dividerFull} />
          </>
        )}
        <SummaryRow
          icon={UserCheck}
          label="Currently with"
          value={currentHolderName ?? "Unknown holder"}
        />
        <View style={summaryStyles.divider} />
        <SummaryRow
          icon={Calendar}
          label={isOverdue ? "Was Due By" : "Return by"}
          value={dueBackAt ? formatDateTime(dueBackAt) : "Return time not set"}
          valueTone={isOverdue ? "danger" : undefined}
        />
      </View>

      <View style={styles.declaration}>
        <TriangleAlert size={14} color={theme.colors.warning} strokeWidth={2} />
        <Text style={styles.declarationText}>
          By confirming, you accept full responsibility for this keyset while it
          is in your custody. A fee of{" "}
          <Text style={styles.declarationBold}>$300</Text> will be charged if
          the keyset is lost or damaged.
        </Text>
      </View>
    </ConfirmSheet>
  );
});

const styles = StyleSheet.create({
  declaration: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: theme.colors.warningSoft,
    borderWidth: 1,
    borderColor: theme.colors.warning + "55",
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
  },
  declarationText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.text,
    lineHeight: 18,
  },
  declarationBold: {
    fontWeight: "700",
    color: theme.colors.text,
  },
});


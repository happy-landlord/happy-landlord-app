import { memo } from "react";
import { View } from "react-native";
import { Calendar, UserCheck } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { ConfirmModal } from "@/components/ui";
import { SelectedKeysSummary } from "./SelectedKeysSummary";
import { SummaryRow, summaryStyles } from "./KeySetSummaryRow";
import { formatDateTime } from "@/lib/utils";
import type { KeyInSet } from "@/lib/services";

export type TransferConfirmModalProps = {
  visible: boolean;
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
  currentHolderName,
  transferringKeys = [],
  dueBackAt,
  isPending,
  onCancel,
  onConfirm,
}: TransferConfirmModalProps) {
  return (
    <ConfirmModal
      visible={visible}
      title="Transfer keys?"
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
          label="Return by"
          value={dueBackAt ? formatDateTime(dueBackAt) : "Return time not set"}
        />
      </View>
    </ConfirmModal>
  );
});

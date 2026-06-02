import { memo } from "react";
import { View } from "react-native";
import { Archive, Calendar, UserRound } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { ConfirmSheet } from "@/components/ui";
import { SelectedKeysSummary } from "./SelectedKeysSummary";
import { SummaryRow, summaryStyles } from "./KeySetSummaryRow";
import { formatDateTime } from "@/lib/utils";
import type { KeyInSet } from "@/lib/services";

export type ReturnConfirmModalProps = {
  visible: boolean;
  /** Name of the keyset being returned — shown in the sheet title. */
  keySetName: string;
  /** Property code to direct the agent to the correct cabinet slot. */
  propertyCode?: string | null;
  /** Name of the person returning the keys. */
  holderName?: string | null;
  /** Keys being returned — shown as a summary in the modal. */
  returningKeys?: KeyInSet[];
  /** Explicit due-back date. */
  dueBackAt?: string | null;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export const ReturnConfirmModal = memo(function ReturnConfirmModal({
  visible,
  keySetName,
  propertyCode,
  holderName,
  returningKeys = [],
  dueBackAt,
  isPending,
  onCancel,
  onConfirm,
}: ReturnConfirmModalProps) {
  return (
    <ConfirmSheet
      visible={visible}
      title={`Return ${keySetName}`}
      subtitle="Confirm these keys are going back into the cabinet. Place them on the hook for this property before confirming."
      confirmLabel={isPending ? "Returning…" : "Confirm return"}
      confirmTone="danger"
      isPending={isPending}
      onCancel={onCancel}
      onConfirm={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        onConfirm();
      }}
    >
      <View style={summaryStyles.card}>
        {returningKeys.length > 0 && (
          <>
            <View style={summaryStyles.cardPadded}>
              <SelectedKeysSummary keys={returningKeys} />
            </View>
            <View style={summaryStyles.dividerFull} />
          </>
        )}
        {holderName && (
          <>
            <SummaryRow icon={UserRound} label="Return by" value={holderName} />
            <View style={summaryStyles.divider} />
          </>
        )}
        <SummaryRow
          icon={Calendar}
          label="Due date"
          value={dueBackAt ? formatDateTime(dueBackAt) : "Return time not set"}
        />
        <View style={summaryStyles.divider} />
        <SummaryRow
          icon={Archive}
          label="Cabinet slot"
          value={propertyCode ?? "Property code unavailable"}
          valueTone={propertyCode ? "primary" : undefined}
        />
      </View>
    </ConfirmSheet>
  );
});

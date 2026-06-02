import { memo } from "react";
import { View } from "react-native";
import { Key, ShieldAlert } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { ConfirmSheet } from "@/components/ui";
import { SummaryRow, summaryStyles } from "./KeySetSummaryRow";

// ── ReportLostSheet ───────────────────────────────────────────────────────────
// Bottom sheet confirmation for the "Report Lost" action.
// Replaces the previous Alert.alert confirm dialog with a consistent
// bottom-sheet UX that matches the other action sheets.

export type ReportLostSheetProps = {
  visible: boolean;
  /** Name of the keyset being reported. */
  keySetName: string;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export const ReportLostSheet = memo(function ReportLostSheet({
  visible,
  keySetName,
  isPending,
  onCancel,
  onConfirm,
}: ReportLostSheetProps) {
  return (
    <ConfirmSheet
      visible={visible}
      title="Report as lost?"
      subtitle="This will mark the keyset as missing or damaged. This action cannot be undone easily."
      confirmLabel={isPending ? "Reporting…" : "Report Lost"}
      confirmTone="danger"
      isPending={isPending}
      onCancel={onCancel}
      onConfirm={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        onConfirm();
      }}
    >
      <View style={summaryStyles.card}>
        <SummaryRow icon={Key} label="Keyset" value={keySetName} />
        <View style={summaryStyles.divider} />
        <SummaryRow
          icon={ShieldAlert}
          label="Status after"
          value="Missing / Damaged"
        />
      </View>
    </ConfirmSheet>
  );
});


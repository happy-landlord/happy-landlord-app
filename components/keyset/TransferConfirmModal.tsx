import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Calendar, UserCheck } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { ConfirmModal, IconBadge } from "@/components/ui";
import { SelectedKeysSummary } from "./SelectedKeysSummary";
import { theme } from "@/constants";
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
      <View style={styles.summary}>
        {transferringKeys.length > 0 ? (
          <>
            <View style={styles.summaryPadded}>
              <SelectedKeysSummary keys={transferringKeys} />
            </View>
            <View style={styles.dividerFull} />
          </>
        ) : null}

        <SummaryRow
          icon={UserCheck}
          label="Currently with"
          value={currentHolderName ?? "Unknown holder"}
        />
        <View style={styles.divider} />
        <SummaryRow
          icon={Calendar}
          label="Return by"
          value={dueBackAt ? formatDateTime(dueBackAt) : "Return time not set"}
        />
      </View>
    </ConfirmModal>
  );
});

// ── Local row helper — uses IconBadge primitive ──────────────────────────────

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <IconBadge icon={icon} tone="primary" size="sm" />
      <View style={styles.textBlock}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    width: "100%",
    backgroundColor: theme.colors.surfaceWarm,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  summaryPadded: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
  },
  textBlock: { flex: 1, gap: 2 },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  value: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: theme.spacing.md + 30 + theme.spacing.sm,
  },
  dividerFull: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
});

import { memo, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Archive, Calendar, UserRound } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { ConfirmModal, IconBadge } from "@/components/ui";
import { SelectedKeysSummary } from "./SelectedKeysSummary";
import { theme } from "@/constants";
import { formatDateTime } from "@/lib/utils";
import type { KeyInSet } from "@/lib/services";

export type ReturnConfirmModalProps = {
  visible: boolean;
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
  propertyCode,
  holderName,
  returningKeys = [],
  dueBackAt,
  isPending,
  onCancel,
  onConfirm,
}: ReturnConfirmModalProps) {
  return (
    <ConfirmModal
      visible={visible}
      title="Return keys?"
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
      <View style={styles.summary}>
        {returningKeys.length > 0 ? (
          <>
            <View style={styles.summaryPadded}>
              <SelectedKeysSummary keys={returningKeys} />
            </View>
            <View style={styles.dividerFull} />
          </>
        ) : null}

        {holderName ? (
          <>
            <SummaryRow
              icon={
                <IconBadge icon={UserRound} tone="primary" size="sm" />
              }
              label="Return by"
              value={holderName}
            />
            <View style={styles.divider} />
          </>
        ) : null}

        <SummaryRow
          icon={<IconBadge icon={Calendar} tone="primary" size="sm" />}
          label="Due date"
          value={dueBackAt ? formatDateTime(dueBackAt) : "Return time not set"}
        />

        <View style={styles.divider} />

        <SummaryRow
          icon={<IconBadge icon={Archive} tone="primary" size="sm" />}
          label="Cabinet slot"
          value={propertyCode ?? "Property code unavailable"}
          valueTone={propertyCode ? "primary" : undefined}
        />
      </View>
    </ConfirmModal>
  );
});

// ── Sub-component ────────────────────────────────────────────────────────────

function SummaryRow({
  icon,
  label,
  value,
  valueTone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  valueTone?: "primary";
}) {
  return (
    <View style={styles.row}>
      {icon}
      <View style={styles.textBlock}>
        <Text style={styles.label}>{label}</Text>
        <Text
          style={[
            styles.value,
            valueTone === "primary" && styles.valuePrimary,
          ]}
          numberOfLines={1}
        >
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
  valuePrimary: {
    color: theme.colors.primaryDark,
    fontWeight: "800",
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

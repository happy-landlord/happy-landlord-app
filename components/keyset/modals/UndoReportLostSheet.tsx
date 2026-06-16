import { memo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Archive, UserRound } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { ConfirmSheet } from "@/components/ui";
import { SelectedKeysSummary } from "./SelectedKeysSummary";
import { SummaryRow, summaryStyles } from "./KeySetSummaryRow";
import { theme } from "@/constants";
import type { KeyInSet } from "@/lib/services";

// ── UndoReportLostSheet ───────────────────────────────────────────────────────
// Bottom sheet to confirm undoing a "missing / damaged" report on a keyset.
// Mirrors ReturnConfirmModal: keys list → holder → cabinet slot → notes.

export type UndoReportLostSheetProps = {
  visible: boolean;
  keySetName: string;
  /** Keys belonging to the keyset — shown in the summary list. */
  keys?: KeyInSet[];
  /** Name of the person who originally marked it lost. */
  markedByName?: string | null;
  /** Cabinet code from the property — tells the agent which slot to place keys in. */
  cabinetCode?: string | null;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: (notes: string | null) => void;
};

export const UndoReportLostSheet = memo(function UndoReportLostSheet({
  visible,
  keySetName,
  keys = [],
  markedByName,
  cabinetCode,
  isPending,
  onCancel,
  onConfirm,
}: UndoReportLostSheetProps) {
  const [notes, setNotes] = useState("");

  function handleCancel() {
    setNotes("");
    onCancel();
  }

  function handleConfirm() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onConfirm(notes.trim() || null);
    setNotes("");
  }

  return (
    <ConfirmSheet
      visible={visible}
      title={`Resolve ${keySetName}`}
      subtitle="Confirm these keys are accounted for. Place them back on the hook for this property before confirming."
      confirmLabel={isPending ? "Resolving…" : "Confirm resolve"}
      confirmTone="primary"
      isPending={isPending}
      keyboardShouldPersistTaps="handled"
      onCancel={handleCancel}
      onConfirm={handleConfirm}
    >
      <View style={summaryStyles.card}>
        {keys.length > 0 && (
          <>
            <View style={summaryStyles.cardPadded}>
              <SelectedKeysSummary keys={keys} />
            </View>
            <View style={summaryStyles.dividerFull} />
          </>
        )}
        {markedByName && (
          <>
            <SummaryRow icon={UserRound} label="Marked lost by" value={markedByName} />
            <View style={summaryStyles.divider} />
          </>
        )}
        <SummaryRow
          icon={Archive}
          label="Cabinet slot"
          value={cabinetCode ?? "No cabinet code set"}
          valueTone={cabinetCode ? "primary" : undefined}
        />
      </View>

      {/* Optional notes */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Notes (optional)</Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Add a note for the activity log…"
          placeholderTextColor={theme.colors.textMuted}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          returnKeyType="default"
          editable={!isPending}
        />
      </View>
    </ConfirmSheet>
  );
});

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fieldGroup: { gap: 6 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textLight,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  notesInput: {
    backgroundColor: theme.colors.surfaceWarm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    minHeight: 80,
  },
});

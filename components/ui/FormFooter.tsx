import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "@/constants";
import { Button } from "./Button";

export interface FormFooterProps {
  onCancel: () => void;
  onSave: () => void;
  /** Shows a spinner + disables the Save button while a save is in flight. */
  saving?: boolean;
  /** Additional condition that disables Save (e.g. validation pending). */
  saveDisabled?: boolean;
  cancelLabel?: string;
  saveLabel?: string;
}

/**
 * Sticky bottom action bar with a `Cancel` (outline) + `Save` (primary) pair,
 * shared by the add/edit property & keyset forms. Handles safe-area padding.
 */
export function FormFooter({
  onCancel,
  onSave,
  saving = false,
  saveDisabled = false,
  cancelLabel = "Cancel",
  saveLabel = "Save",
}: FormFooterProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[styles.footer, { paddingBottom: insets.bottom + theme.spacing.sm }]}
    >
      <Button
        title={cancelLabel}
        variant="outline"
        onPress={onCancel}
        disabled={saving}
        style={styles.cancelBtn}
      />
      <Button
        title={saveLabel}
        variant="primary"
        loading={saving}
        disabled={saving || saveDisabled}
        onPress={onSave}
        style={styles.saveBtn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  cancelBtn: { flex: 1 },
  saveBtn: { flex: 2 },
});


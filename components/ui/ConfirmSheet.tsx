import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { X } from "lucide-react-native";

import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";
import { theme } from "@/constants";

// ── ConfirmSheet ──────────────────────────────────────────────────────────────
// Bottom-sheet variant of <ConfirmModal> — same API, slides up from the bottom
// instead of appearing as a centred overlay card.
//
// Props are intentionally kept compatible with ConfirmModal so callers can
// swap between the two with minimal changes.

export type ConfirmSheetTone = "primary" | "success" | "danger";

export type ConfirmSheetProps = {
  visible: boolean;
  title: string;
  subtitle?: string;
  /** Body content (typically a summary block). */
  children?: ReactNode;
  /** Label of the right-hand confirm button. */
  confirmLabel: string;
  /** Tone of the confirm button. Defaults to `primary`. */
  confirmTone?: ConfirmSheetTone;
  /** Label of the left-hand cancel button. Defaults to `Cancel`. */
  cancelLabel?: string;
  /** When true, shows a spinner inside the confirm button and disables both. */
  isPending: boolean;
  /** Max height of the scrollable body area. Defaults to 400. */
  scrollMaxHeight?: number;
  /**
   * Passed through to the inner ScrollView.
   * Use `"handled"` when children contain TextInput fields.
   */
  keyboardShouldPersistTaps?: "always" | "handled" | "never";
  onCancel: () => void;
  onConfirm: () => void;
};

const TONE_VARIANT: Record<ConfirmSheetTone, "primary" | "success" | "danger"> =
  {
    primary: "primary",
    success: "success",
    danger: "danger",
  };

export function ConfirmSheet({
  visible,
  title,
  subtitle,
  children,
  confirmLabel,
  confirmTone = "primary",
  cancelLabel = "Cancel",
  isPending,
  scrollMaxHeight = 400,
  keyboardShouldPersistTaps,
  onCancel,
  onConfirm,
}: ConfirmSheetProps) {
  const handleClose = isPending ? () => {} : onCancel;

  return (
    <BottomSheet visible={visible} onClose={handleClose}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <Pressable
          onPress={onCancel}
          disabled={isPending}
          style={({ pressed }) => [
            styles.closeBtn,
            pressed && { opacity: 0.6 },
          ]}
          hitSlop={8}
        >
          <X size={20} color={theme.colors.textMuted} strokeWidth={2} />
        </Pressable>
      </View>

      {/* Body */}
      {children ? (
        <ScrollView
          style={[styles.scroll, { maxHeight: scrollMaxHeight }]}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : null}

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title={cancelLabel}
          variant="outline"
          onPress={onCancel}
          disabled={isPending}
          style={styles.actionBtn}
        />
        <Button
          title={confirmLabel}
          variant={TONE_VARIANT[confirmTone]}
          onPress={onConfirm}
          disabled={isPending}
          loading={isPending}
          style={styles.actionBtn}
        />
      </View>
    </BottomSheet>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingBottom: theme.spacing.md,
  },
  headerText: { flex: 1, gap: 4, paddingRight: theme.spacing.sm },
  title: { fontSize: 18, fontWeight: "700", color: theme.colors.text },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.neutralSoft,
  },
  scroll: {},
  scrollContent: { gap: theme.spacing.md, paddingBottom: theme.spacing.sm },
  actions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.md,
  },
  actionBtn: { flex: 1 },
});


import { memo, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  Calendar,
  Check,
  ChevronDown,
  Clock3,
  KeyRound,
} from "lucide-react-native";

import { KEY_TYPE_ICON, KEY_TYPE_LABEL } from "@/components/key/keyLabels";
import { theme } from "@/constants/theme";
import { formatDateTime } from "@/lib/utils/format";
import type { KeyInSet } from "@/lib/services/keySets.service";

const PICKER_SHEET_HIDDEN_Y = 360;
const PICKER_ANIMATION_MS = 220;
const DURATION_DAYS = [1, 2, 3, 5, 7] as const;

export type CheckoutConfirmModalProps = {
  visible: boolean;
  /** ISO due-back timestamp — when the agent is expected to return the keys. */
  dueBackAt: string | null;
  /** Selected checkout duration in days. */
  durationDays?: number;
  /** Called when the duration picker changes. */
  onDurationDaysChange?: (days: number) => void;
  /** Keys selected for checkout — rendered as a summary list. */
  selectedKeys?: KeyInSet[];
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export const CheckoutConfirmModal = memo(function CheckoutConfirmModal({
  visible,
  dueBackAt,
  durationDays = 1,
  onDurationDaysChange,
  selectedKeys = [],
  isPending,
  onCancel,
  onConfirm,
}: CheckoutConfirmModalProps) {
  const [durationPickerOpen, setDurationPickerOpen] = useState(false);
  const [durationPickerMounted, setDurationPickerMounted] = useState(false);
  const pickerTranslateY = useRef(
    new Animated.Value(PICKER_SHEET_HIDDEN_Y),
  ).current;
  const pickerScrimOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      setDurationPickerOpen(false);
      setDurationPickerMounted(false);
      pickerTranslateY.setValue(PICKER_SHEET_HIDDEN_Y);
      pickerScrimOpacity.setValue(0);
    }
  }, [pickerScrimOpacity, pickerTranslateY, visible]);

  const openDurationPicker = () => {
    if (isPending || !onDurationDaysChange) return;
    setDurationPickerOpen(true);
    setDurationPickerMounted(true);
    pickerTranslateY.setValue(PICKER_SHEET_HIDDEN_Y);
    pickerScrimOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(pickerTranslateY, {
        toValue: 0,
        duration: PICKER_ANIMATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(pickerScrimOpacity, {
        toValue: 1,
        duration: PICKER_ANIMATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeDurationPicker = () => {
    if (!durationPickerMounted) return;
    setDurationPickerOpen(false);
    Animated.parallel([
      Animated.timing(pickerTranslateY, {
        toValue: PICKER_SHEET_HIDDEN_Y,
        duration: PICKER_ANIMATION_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(pickerScrimOpacity, {
        toValue: 0,
        duration: PICKER_ANIMATION_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setDurationPickerMounted(false);
    });
  };

  const handleCancel = () => {
    closeDurationPicker();
    onCancel();
  };

  const handleConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    closeDurationPicker();
    onConfirm();
  };

  // While the mutation is in-flight, suppress cancel paths to avoid orphaned UI.
  const handleDismiss = isPending ? undefined : handleCancel;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={handleDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss checkout"
        />

        <View style={styles.card}>
          <Text style={styles.title}>Borrow keys?</Text>
          <Text style={styles.subtitle}>
            Confirm you are taking the keys. Please return them within the
            checkout window.
          </Text>

          <View style={styles.summary}>
            {selectedKeys.length > 0 && (
              <>
                <SelectedKeysSummary selectedKeys={selectedKeys} />
                <View style={styles.dividerFull} />
              </>
            )}
            <DurationSelector
              value={durationDays}
              disabled={isPending || !onDurationDaysChange}
              onToggle={
                durationPickerOpen ? closeDurationPicker : openDurationPicker
              }
            />
            <View style={styles.divider} />
            <SummaryRow
              icon={
                <Calendar
                  size={15}
                  color={theme.colors.primary}
                  strokeWidth={1.8}
                />
              }
              label="Return by"
              value={dueBackAt ? formatDateTime(dueBackAt) : "—"}
            />
          </View>

          <View style={styles.actions}>
            <ActionButton
              variant="cancel"
              label="Cancel"
              disabled={isPending}
              onPress={handleCancel}
            />
            <ActionButton
              variant="confirm"
              label={isPending ? "Checking out…" : "Checkout"}
              loading={isPending}
              disabled={isPending}
              onPress={handleConfirm}
            />
          </View>
        </View>

        {/* Inline duration picker — rendered inside the same Modal to avoid
            the iOS two-Modal stacking limitation. Slides up from the bottom. */}
        {durationPickerMounted && (
          <>
            <Animated.View
              pointerEvents={durationPickerOpen ? "auto" : "none"}
              style={[styles.pickerScrim, { opacity: pickerScrimOpacity }]}
            >
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={closeDurationPicker}
              />
            </Animated.View>
            <Animated.View
              style={[
                styles.pickerSheet,
                { transform: [{ translateY: pickerTranslateY }] },
              ]}
            >
              <View style={styles.pickerHandle} />
              <Text style={styles.pickerTitle}>Checkout duration</Text>
              {DURATION_DAYS.map((days) => {
                const label = days === 1 ? "1 day" : `${days} days`;
                const selected = days === durationDays;
                return (
                  <Pressable
                    key={days}
                    style={({ pressed }) => [
                      styles.pickerOption,
                      selected && styles.pickerOptionSelected,
                      pressed && styles.btnPressed,
                    ]}
                    onPress={() => {
                      onDurationDaysChange?.(days);
                      closeDurationPicker();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    accessibilityState={{ selected }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        selected && styles.pickerOptionTextSelected,
                      ]}
                    >
                      {label}
                    </Text>
                    {selected && (
                      <Check
                        size={16}
                        color={theme.colors.primary}
                        strokeWidth={2.5}
                      />
                    )}
                  </Pressable>
                );
              })}
              <Pressable
                style={styles.pickerCancel}
                onPress={closeDurationPicker}
              >
                <Text style={styles.pickerCancelText}>Cancel</Text>
              </Pressable>
            </Animated.View>
          </>
        )}
      </View>
    </Modal>
  );
});

// ─── Sub-components ────────────────────────────────────────────────────────

function SelectedKeysSummary({ selectedKeys }: { selectedKeys: KeyInSet[] }) {
  return (
    <View style={styles.keysSection}>
      <View style={styles.keysHeaderRow}>
        <Text style={styles.summaryLabel}>Keys selected</Text>
        <Text style={styles.keysCount}>{selectedKeys.length}</Text>
      </View>
      <View>
        {selectedKeys.map((k) => {
          const Icon = KEY_TYPE_ICON[k.key_type] ?? KeyRound;
          const label =
            k.key_type === "other"
              ? k.label
              : (KEY_TYPE_LABEL[k.key_type] ?? k.key_type);
          return (
            <View key={k.id} style={styles.keyRow}>
              <View style={styles.keyIconCircle}>
                <Icon
                  size={13}
                  color={theme.colors.primary}
                  strokeWidth={1.8}
                />
              </View>
              <Text style={styles.keyRowLabel} numberOfLines={1}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function DurationSelector({
  value,
  disabled,
  onToggle,
}: {
  value: number;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryIcon}>
        <Clock3 size={15} color={theme.colors.primary} strokeWidth={1.8} />
      </View>
      <View style={styles.summaryTextBlock}>
        <Text style={styles.summaryLabel}>Duration</Text>
        <Pressable
          onPress={onToggle}
          disabled={disabled}
          style={({ pressed }) => [
            styles.durationSelect,
            pressed && !disabled && styles.btnPressed,
            disabled && styles.durationSelectDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Select checkout duration"
          accessibilityState={{ disabled }}
        >
          <Text style={styles.durationSelectText}>
            {value === 1 ? "1 day" : `${value} days`}
          </Text>
          <ChevronDown size={16} color={theme.colors.primary} strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  );
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryIcon}>{icon}</View>
      <View style={styles.summaryTextBlock}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summaryValue}>{value}</Text>
      </View>
    </View>
  );
}

type ActionButtonProps = {
  label: string;
  variant: "cancel" | "confirm";
  disabled: boolean;
  loading?: boolean;
  onPress: () => void;
};

function ActionButton({
  label,
  variant,
  disabled,
  loading,
  onPress,
}: ActionButtonProps) {
  const isCancel = variant === "cancel";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        isCancel ? styles.btnCancel : styles.btnConfirm,
        pressed && !disabled && styles.btnPressed,
        disabled && styles.btnDisabled,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      {loading ? <ActivityIndicator size="small" color="#fff" /> : null}
      <Text
        style={isCancel ? styles.btnCancelLabel : styles.btnConfirmLabel}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.88}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.md,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(38, 38, 38, 0.46)",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    shadowColor: theme.colors.charcoal,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginTop: theme.spacing.xs,
  },
  summary: {
    width: "100%",
    backgroundColor: theme.colors.surfaceWarm,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: theme.spacing.md,
    overflow: "hidden",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryTextBlock: {
    flex: 1,
    gap: 2,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: theme.spacing.md + 32 + theme.spacing.sm,
  },
  dividerFull: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  keysSection: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    gap: theme.spacing.sm,
  },
  keysHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
    marginLeft: 32 + theme.spacing.sm,
  },
  keysCount: {
    minWidth: 24,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    overflow: "hidden",
    backgroundColor: theme.colors.primarySoft,
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  keyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: 6,
  },
  keyIconCircle: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  keyRowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  durationSelect: {
    minHeight: 38,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
    marginTop: 4,
  },
  durationSelectDisabled: {
    opacity: 0.55,
  },
  durationSelectText: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text,
  },
  // ── Inline duration picker sheet ──────────────────────────────────────────
  pickerScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(38, 38, 38, 0.18)",
    zIndex: 20,
    elevation: 20,
  },
  pickerSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 21,
    elevation: 21,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.screen,
    paddingBottom: theme.spacing.xl,
    paddingTop: theme.spacing.sm,
  },
  pickerHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  pickerOptionSelected: {
    backgroundColor: theme.colors.primarySoft,
    marginHorizontal: -theme.spacing.screen,
    paddingHorizontal: theme.spacing.screen,
  },
  pickerOptionText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  pickerOptionTextSelected: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
  pickerCancel: {
    marginTop: theme.spacing.md,
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
  },
  pickerCancelText: {
    fontSize: 16,
    color: theme.colors.textMuted,
    fontWeight: "500",
  },
  actions: {
    flexDirection: "row",
    width: "100%",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  btn: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: theme.spacing.sm,
  },
  btnCancel: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  btnConfirm: {
    backgroundColor: theme.colors.success,
  },
  btnPressed: {
    opacity: 0.75,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnCancelLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  btnConfirmLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: theme.colors.textInverse,
  },
});

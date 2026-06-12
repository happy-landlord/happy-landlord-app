import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import {
  Calendar,
  CalendarClock,
  ChevronLeft,
  Clock,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { Button } from "@/components/ui/Button";
import { theme, DURATION_DAYS, OVERLAY_PANEL_SLIDE_OUT } from "@/constants";
import {
  addDays,
  formatDate,
  formatDueAt,
  formatTime,
  nextHalfHour,
  setDatePart,
  setTimePart,
} from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type ActivePicker = {
  field: "starts";
  mode: "date" | "time";
};

type Props = {
  visible: boolean;
  keySetName: string;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (startsAt: Date, endsAt: Date, notes: string) => void;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
// Date helpers live in `@/lib/utils/time`. Nothing component-specific here.

// ── ReserveKeySetModal ────────────────────────────────────────────────────────
// The date/time picker slides in as a right-side panel rendered inside the
// same Modal that BottomSheet owns (via ConfirmSheet's overlayContent prop).
// This avoids the iOS restriction on nested Modals entirely.

export function ReserveKeySetModal({
  visible,
  keySetName,
  isPending,
  onClose,
  onConfirm,
}: Props) {
  const insets = useSafeAreaInsets();
  const [startsAt, setStartsAt] = useState<Date>(() => nextHalfHour());
  const [durationDays, setDurationDays] = useState<number>(1);
  const [activePicker, setActivePicker] = useState<ActivePicker | null>(null);
  const [pickerValue, setPickerValue] = useState<Date>(new Date());

  // Slide-up animation for the bottom picker panel
  const slideY = useRef(new Animated.Value(OVERLAY_PANEL_SLIDE_OUT)).current;

  const endsAt = addDays(durationDays, startsAt);

  useEffect(() => {
    if (visible) {
      setStartsAt(nextHalfHour());
      setDurationDays(1);
    }
    // Dismiss picker whenever sheet visibility changes
    closePicker();
  }, [visible]);

  useEffect(() => {
    Animated.timing(slideY, {
      toValue: activePicker ? 0 : OVERLAY_PANEL_SLIDE_OUT,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [activePicker, slideY]);

  // ── Picker helpers ─────────────────────────────────────────────────────────

  const openPicker = (mode: "date" | "time") => {
    setPickerValue(startsAt);
    setActivePicker({ field: "starts", mode });
  };

  const closePicker = () => setActivePicker(null);

  const applyAndClose = () => {
    if (!activePicker) return;
    setStartsAt((prev) =>
      activePicker.mode === "date"
        ? setDatePart(prev, pickerValue)
        : setTimePart(prev, pickerValue),
    );
    closePicker();
  };

  const handlePickerChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (date) setPickerValue(date);
  };

  // ── Validation + submit ────────────────────────────────────────────────────

  const handleConfirm = () => {
    if (startsAt <= new Date()) {
      Alert.alert("Invalid time", "Start time must be in the future.");
      return;
    }
    onConfirm(startsAt, endsAt, "");
  };  // ── Right-side picker panel (rendered inside same Modal via overlayContent) ─

  const pickerPanel = (
    <>
      {/* Backdrop — tap to cancel */}
      {activePicker && (
        <Pressable style={StyleSheet.absoluteFill} onPress={closePicker} />
      )}

      {/* Sliding panel */}
      <Animated.View
        style={[
          styles.bottomPanel,
          { paddingBottom: insets.bottom + theme.spacing.md },
          { transform: [{ translateY: slideY }] },
        ]}
        pointerEvents={activePicker ? "box-none" : "none"}
      >
        {/* Panel header */}
        <View style={styles.panelHeader}>
          <Pressable
            onPress={closePicker}
            hitSlop={10}
            style={({ pressed }) => [
              styles.backBtn,
              pressed && { opacity: 0.6 },
            ]}
          >
            <ChevronLeft
              size={20}
              color={theme.colors.text}
              strokeWidth={2.5}
            />
          </Pressable>
          <Text style={styles.panelTitle}>
            {activePicker?.mode === "date" ? "Select Date" : "Select Time"}
          </Text>
        </View>

        {/* Picker */}
        {activePicker && (
          <DateTimePicker
            value={pickerValue}
            mode={activePicker.mode}
            display="spinner"
            minimumDate={activePicker.mode === "date" ? new Date() : undefined}
            onChange={handlePickerChange}
            style={styles.picker}
            textColor={theme.colors.text}
          />
        )}

        {/* Actions */}
        <View style={styles.panelActions}>
          <Button
            title="Cancel"
            variant="outline"
            onPress={closePicker}
            style={styles.panelBtn}
          />
          <Button
            title="Done"
            variant="primary"
            onPress={applyAndClose}
            style={styles.panelBtn}
          />
        </View>
      </Animated.View>
    </>
  );

  // ── Main form ──────────────────────────────────────────────────────────────

  return (
    <ConfirmSheet
      visible={visible}
      title={`Reserve ${keySetName}`}
      confirmLabel={isPending ? "Reserving…" : "Reserve"}
      confirmTone="primary"
      isPending={isPending}
      scrollMaxHeight={480}
      keyboardShouldPersistTaps="handled"
      onCancel={onClose}
      onConfirm={handleConfirm}
      overlayContent={pickerPanel}
    >
      {/* Start date/time */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>START</Text>
        <View style={styles.dtRow}>
          <Pressable
            style={({ pressed }) => [
              styles.dtField,
              activePicker?.mode === "date" && styles.dtFieldActive,
              pressed && styles.dtFieldPressed,
            ]}
            onPress={() => openPicker("date")}
          >
            <Calendar size={14} color={theme.colors.textMuted} strokeWidth={2} />
            <Text style={styles.dtValue}>
              {formatDate(startsAt.toISOString())}
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.dtField,
              activePicker?.mode === "time" && styles.dtFieldActive,
              pressed && styles.dtFieldPressed,
            ]}
            onPress={() => openPicker("time")}
          >
            <Clock size={14} color={theme.colors.textMuted} strokeWidth={2} />
            <Text style={styles.dtValue}>
              {formatTime(startsAt.toISOString())}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Duration chips */}
      <View style={styles.chipGrid}>
        {DURATION_DAYS.map((d) => {
          const selected = d === durationDays;
          return (
            <Pressable
              key={d}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.chipSelected,
                pressed && { opacity: 0.72 },
              ]}
              onPress={() => setDurationDays(d)}
              disabled={isPending}
            >
              <Text
                style={[styles.chipText, selected && styles.chipTextSelected]}
              >
                {d === 1 ? "1 day" : `${d} days`}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Computed end time callout */}
      <View style={styles.dueRow}>
        <CalendarClock size={14} color={theme.colors.textMuted} strokeWidth={2} />
        <Text style={styles.dueText}>
          Return by{" "}
          <Text style={styles.dueDate}>
            {formatDueAt(endsAt.toISOString())}
          </Text>
        </Text>
      </View>
    </ConfirmSheet>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Form ──────────────────────────────────────────────────────────────────
  fieldGroup: { gap: 6 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textLight,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  dtRow: { flexDirection: "row", gap: theme.spacing.sm },
  dtField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.surfaceWarm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dtFieldActive: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentSoft,
  },
  dtFieldPressed: { opacity: 0.7 },
  dtValue: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    flex: 1,
  },
  chipGrid: { flexDirection: "row", gap: 8, justifyContent: "center" },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.neutralSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipSelected: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accent,
  },
  chipText: { fontSize: 13, fontWeight: "600", color: theme.colors.textMuted },
  chipTextSelected: { color: theme.colors.accent, fontWeight: "700" },
  dueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    gap: 6,
  },
  dueText: {
    flexShrink: 1,
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: "center",
  },
  dueDate: { fontWeight: "700", color: theme.colors.text },
  notesInput: {},

  // ── Bottom picker panel ───────────────────────────────────────────────────
  bottomPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.screen,
    gap: theme.spacing.md,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.neutralSoft,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
  },
  picker: { width: "100%" },
  panelActions: { flexDirection: "row", gap: theme.spacing.sm },
  panelBtn: { flex: 1 },
});

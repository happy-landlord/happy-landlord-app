import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Calendar, Clock, X } from "lucide-react-native";

import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { Button } from "@/components/ui/Button";
import { theme } from "@/constants";
import { formatDate, formatTime } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type ActivePicker = {
  field: "starts" | "ends";
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

/** Round a date up to the next whole 30-minute mark. */
function nextHalfHour(base: Date = new Date()): Date {
  const d = new Date(base);
  const minutes = d.getMinutes();
  const delta = minutes < 30 ? 30 - minutes : 60 - minutes;
  d.setMinutes(d.getMinutes() + delta, 0, 0);
  return d;
}

function setDatePart(existing: Date, incoming: Date): Date {
  const d = new Date(existing);
  d.setFullYear(incoming.getFullYear());
  d.setMonth(incoming.getMonth());
  d.setDate(incoming.getDate());
  return d;
}

function setTimePart(existing: Date, incoming: Date): Date {
  const d = new Date(existing);
  d.setHours(incoming.getHours());
  d.setMinutes(incoming.getMinutes());
  d.setSeconds(0, 0);
  return d;
}

// ── ReserveKeySetModal ────────────────────────────────────────────────────────
// Bottom sheet form for creating a new keyset reservation.
// Uses <ConfirmSheet> for the header / scroll-body / action-buttons shell.
//
// - Android date/time picker: native dialog (rendered outside ConfirmSheet)
// - iOS date/time picker: spinner in a mini modal overlay (also outside ConfirmSheet)

export function ReserveKeySetModal({
  visible,
  keySetName,
  isPending,
  onClose,
  onConfirm,
}: Props) {
  const [startsAt, setStartsAt] = useState<Date>(() => nextHalfHour());
  const [endsAt, setEndsAt] = useState<Date>(
    () => new Date(nextHalfHour().getTime() + 2 * 60 * 60 * 1000),
  );
  const [notes, setNotes] = useState("");
  const [activePicker, setActivePicker] = useState<ActivePicker | null>(null);
  // iOS: accumulate value in spinner without committing until "Done"
  const [iosPickerValue, setIosPickerValue] = useState<Date>(new Date());

  // Reset when the sheet opens
  useEffect(() => {
    if (visible) {
      const start = nextHalfHour();
      setStartsAt(start);
      setEndsAt(new Date(start.getTime() + 2 * 60 * 60 * 1000));
      setNotes("");
      setActivePicker(null);
    }
  }, [visible]);

  // ── Picker logic ───────────────────────────────────────────────────────────

  const openPicker = (field: "starts" | "ends", mode: "date" | "time") => {
    const current = field === "starts" ? startsAt : endsAt;
    setIosPickerValue(current);
    setActivePicker({ field, mode });
  };

  const applyPickerValue = (date: Date) => {
    if (!activePicker) return;
    const apply = (prev: Date) =>
      activePicker.mode === "date"
        ? setDatePart(prev, date)
        : setTimePart(prev, date);

    if (activePicker.field === "starts") {
      setStartsAt((prev) => apply(prev));
    } else {
      setEndsAt((prev) => apply(prev));
    }
  };

  const handlePickerChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") {
      setActivePicker(null);
      if (event.type === "set" && date) applyPickerValue(date);
    } else {
      // iOS: just update the temp value; commit on "Done"
      if (date) setIosPickerValue(date);
    }
  };

  const handleIosDone = () => {
    applyPickerValue(iosPickerValue);
    setActivePicker(null);
  };

  // ── Validation + submit ────────────────────────────────────────────────────

  const handleConfirm = () => {
    const now = new Date();
    if (startsAt <= now) {
      Alert.alert("Invalid time", "Start time must be in the future.");
      return;
    }
    if (endsAt <= startsAt) {
      Alert.alert("Invalid time", "End time must be after start time.");
      return;
    }
    onConfirm(startsAt, endsAt, notes);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const minDate = new Date();

  return (
    <>
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
      >
        {/* Start date/time */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>START</Text>
          <View style={styles.dtRow}>
            <Pressable
              style={({ pressed }) => [
                styles.dtField,
                pressed && styles.dtFieldPressed,
              ]}
              onPress={() => openPicker("starts", "date")}
            >
              <Calendar
                size={14}
                color={theme.colors.primary}
                strokeWidth={2}
              />
              <Text style={styles.dtValue}>
                {formatDate(startsAt.toISOString())}
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.dtField,
                pressed && styles.dtFieldPressed,
              ]}
              onPress={() => openPicker("starts", "time")}
            >
              <Clock size={14} color={theme.colors.primary} strokeWidth={2} />
              <Text style={styles.dtValue}>
                {formatTime(startsAt.toISOString())}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* End date/time */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>END</Text>
          <View style={styles.dtRow}>
            <Pressable
              style={({ pressed }) => [
                styles.dtField,
                pressed && styles.dtFieldPressed,
              ]}
              onPress={() => openPicker("ends", "date")}
            >
              <Calendar
                size={14}
                color={theme.colors.primary}
                strokeWidth={2}
              />
              <Text style={styles.dtValue}>
                {formatDate(endsAt.toISOString())}
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.dtField,
                pressed && styles.dtFieldPressed,
              ]}
              onPress={() => openPicker("ends", "time")}
            >
              <Clock size={14} color={theme.colors.primary} strokeWidth={2} />
              <Text style={styles.dtValue}>
                {formatTime(endsAt.toISOString())}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>NOTES (OPTIONAL)</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add a note…"
            placeholderTextColor={theme.colors.textLight}
            multiline
            numberOfLines={3}
            maxLength={300}
            textAlignVertical="top"
          />
        </View>
      </ConfirmSheet>

      {/* Android: native dialog picker — rendered outside ConfirmSheet */}
      {activePicker && Platform.OS === "android" && (
        <DateTimePicker
          value={activePicker.field === "starts" ? startsAt : endsAt}
          mode={activePicker.mode}
          display="default"
          minimumDate={activePicker.mode === "date" ? minDate : undefined}
          onChange={handlePickerChange}
        />
      )}

      {/* iOS: spinner inside a small modal overlay */}
      {activePicker && Platform.OS === "ios" && (
        <Modal
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setActivePicker(null)}
        >
          <Pressable
            style={styles.pickerOverlay}
            onPress={() => setActivePicker(null)}
          >
            <Pressable style={styles.pickerCard} onPress={() => {}}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>
                  {activePicker.mode === "date" ? "Select Date" : "Select Time"}
                </Text>
                <Pressable
                  onPress={() => setActivePicker(null)}
                  hitSlop={8}
                  style={({ pressed }) => pressed && { opacity: 0.6 }}
                >
                  <X size={18} color={theme.colors.textMuted} strokeWidth={2} />
                </Pressable>
              </View>
              <DateTimePicker
                value={iosPickerValue}
                mode={activePicker.mode}
                display="spinner"
                minimumDate={activePicker.mode === "date" ? minDate : undefined}
                onChange={handlePickerChange}
                style={styles.iosPicker}
              />
              <View style={styles.pickerActions}>
                <Button
                  title="Cancel"
                  variant="ghost"
                  onPress={() => setActivePicker(null)}
                  style={styles.pickerBtn}
                />
                <Button
                  title="Done"
                  variant="primary"
                  onPress={handleIosDone}
                  style={styles.pickerBtn}
                />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

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
  dtFieldPressed: { opacity: 0.7 },
  dtValue: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    flex: 1,
  },

  notesInput: {
    backgroundColor: theme.colors.surfaceWarm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.text,
    minHeight: 72,
  },

  // iOS picker modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  pickerCard: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
  },
  iosPicker: { width: "100%" },
  pickerActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  pickerBtn: { flex: 1 },
});

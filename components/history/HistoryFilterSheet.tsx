import { useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  CalendarDays,
  ChevronLeft,
  RotateCcw,
  X,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomSheet } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { theme, OVERLAY_PANEL_SLIDE_OUT } from "@/constants";
import { formatShortDate } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export type HistoryFilters = {
  dateFrom: Date | null;
  dateTo: Date | null;
};

/** Initial / cleared state for {@link HistoryFilters}. */
export const EMPTY_HISTORY_FILTERS: HistoryFilters = {
  dateFrom: null,
  dateTo: null,
};

type Props = {
  visible: boolean;
  onClose: () => void;
  filters: HistoryFilters;
  onChange: (patch: Partial<HistoryFilters>) => void;
  onReset: () => void;
};

// ── Component ─────────────────────────────────────────────────────────────────

export function HistoryFilterSheet({
  visible,
  onClose,
  filters,
  onChange,
  onReset,
}: Props) {
  const insets = useSafeAreaInsets();
  const [activePicker, setActivePicker] = useState<"from" | "to" | null>(null);
  const [pickerValue, setPickerValue] = useState<Date>(new Date());

  const slideY = useRef(new Animated.Value(OVERLAY_PANEL_SLIDE_OUT)).current;

  const hasFilters =
    filters.dateFrom !== null ||
    filters.dateTo !== null;

  const openPicker = (field: "from" | "to") => {
    const current =
      field === "from"
        ? (filters.dateFrom ?? new Date())
        : (filters.dateTo ?? new Date());
    setPickerValue(current);
    setActivePicker(field);
    Animated.timing(slideY, {
      toValue: 0,
      duration: 260,
      useNativeDriver: true,
    }).start();
  };

  const closePicker = () => {
    Animated.timing(slideY, {
      toValue: OVERLAY_PANEL_SLIDE_OUT,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setActivePicker(null));
  };

  const applyAndClose = () => {
    if (activePicker === "from") onChange({ dateFrom: pickerValue });
    else if (activePicker === "to") onChange({ dateTo: pickerValue });
    closePicker();
  };

  const pickerPanel = (
    <>
      {activePicker && (
        <Pressable style={StyleSheet.absoluteFill} onPress={closePicker} />
      )}
      <Animated.View
        style={[
          styles.bottomPanel,
          { paddingBottom: insets.bottom + theme.spacing.md },
          { transform: [{ translateY: slideY }] },
        ]}
        pointerEvents={activePicker ? "box-none" : "none"}
      >
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
            {activePicker === "from" ? "From date" : "To date"}
          </Text>
        </View>

        {activePicker && (
          <DateTimePicker
            value={pickerValue}
            mode="date"
            display="spinner"
            textColor={theme.colors.text}
            themeVariant="light"
            minimumDate={
              activePicker === "to"
                ? (filters.dateFrom ?? undefined)
                : undefined
            }
            maximumDate={
              activePicker === "from"
                ? (filters.dateTo ?? new Date())
                : new Date()
            }
            onChange={(_, selected) => {
              if (selected) setPickerValue(selected);
            }}
            style={styles.picker}
          />
        )}

        <View style={styles.panelActions}>
          <Button
            title="Cancel"
            variant="ghost"
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

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      overlayChildren={pickerPanel}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.title}>Filters</Text>
        {hasFilters && (
          <Pressable
            onPress={onReset}
            style={styles.resetBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Reset all filters"
          >
            <RotateCcw
              size={14}
              color={theme.colors.textMuted}
              strokeWidth={2}
            />
            <Text style={styles.resetLabel}>Reset</Text>
          </Pressable>
        )}
      </View>

      {/* ── Date range ──────────────────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>Date range</Text>

      <View style={styles.dateRow}>
        <DateField
          label="From"
          value={filters.dateFrom}
          active={activePicker === "from"}
          onPress={() => openPicker("from")}
          onClear={() => {
            onChange({ dateFrom: null });
            closePicker();
          }}
        />
        <DateField
          label="To"
          value={filters.dateTo}
          fallbackValue={new Date()}
          active={activePicker === "to"}
          onPress={() => openPicker("to")}
          onClear={() => {
            onChange({ dateTo: null });
            closePicker();
          }}
        />
      </View>

      {/* ── Apply button ────────────────────────────────────────────────── */}
      <Button
        title="Apply"
        variant="primary"
        onPress={onClose}
        style={styles.applyBtn}
      />
    </BottomSheet>
  );
}

// ── DateField sub-component ───────────────────────────────────────────────────

function DateField({
  label,
  value,
  fallbackValue,
  active,
  onPress,
  onClear,
}: {
  label: string;
  value: Date | null;
  fallbackValue?: Date;
  active?: boolean;
  onPress: () => void;
  onClear: () => void;
}) {
  const displayDate = value ?? fallbackValue ?? null;
  const isActive = value !== null || active;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.dateField,
        isActive && styles.dateFieldActive,
        pressed && styles.dateFieldPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <CalendarDays
        size={15}
        color={isActive ? theme.colors.primary : theme.colors.textMuted}
        strokeWidth={1.8}
      />
      <View style={styles.dateFieldText}>
        <Text style={styles.dateFieldLabel}>{label}</Text>
        <Text
          style={[
            styles.dateFieldValue,
            isActive && styles.dateFieldValueActive,
          ]}
        >
          {displayDate ? formatShortDate(displayDate.toISOString()) : "Any"}
        </Text>
      </View>
      {value ? (
        <Pressable onPress={onClear} hitSlop={8} accessibilityRole="button">
          <X size={14} color={theme.colors.textMuted} strokeWidth={2} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
  },
  title: { fontSize: 18, fontWeight: "700", color: theme.colors.text },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.neutralSoft,
  },
  resetLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: theme.spacing.sm,
  },
  dateRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  dateField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
  },
  dateFieldActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  dateFieldPressed: { opacity: 0.75 },
  dateFieldText: { flex: 1 },
  dateFieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  dateFieldValue: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  dateFieldValueActive: { color: theme.colors.primary, fontWeight: "600" },

  applyBtn: {
    marginTop: theme.spacing.sm,
  },

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
    shadowColor: "#000",
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
  panelTitle: { fontSize: 16, fontWeight: "700", color: theme.colors.text },
  picker: { width: "100%" },
  panelActions: { flexDirection: "row", gap: theme.spacing.sm },
  panelBtn: { flex: 1 },
});


import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { CalendarDays, RotateCcw, UserRound, X } from "lucide-react-native";

import { BottomSheet } from "@/components/ui";
import { theme } from "@/constants";
import { formatShortDate } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ActivityFilters = {
  myActivityOnly: boolean;
  dateFrom: Date | null;
  dateTo: Date | null;
};

/** Initial / cleared state for {@link ActivityFilters}. */
export const EMPTY_ACTIVITY_FILTERS: ActivityFilters = {
  myActivityOnly: false,
  dateFrom: null,
  dateTo: null,
};

type Props = {
  visible: boolean;
  onClose: () => void;
  filters: ActivityFilters;
  onChange: (patch: Partial<ActivityFilters>) => void;
  onReset: () => void;
};

// ── Component ─────────────────────────────────────────────────────────────────

export function ActivityFilterSheet({
  visible,
  onClose,
  filters,
  onChange,
  onReset,
}: Props) {

  // Track which date picker is open (only one at a time)
  const [activePicker, setActivePicker] = useState<"from" | "to" | null>(null);

  const hasFilters =
    filters.myActivityOnly ||
    filters.dateFrom !== null ||
    filters.dateTo !== null;

  return (
    <BottomSheet visible={visible} onClose={onClose}>
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
            <RotateCcw size={14} color={theme.colors.textMuted} strokeWidth={2} />
            <Text style={styles.resetLabel}>Reset</Text>
          </Pressable>
        )}
      </View>

      {/* ── My activity only ─────────────────────────────────────────────── */}
      <Pressable
        onPress={() => onChange({ myActivityOnly: !filters.myActivityOnly })}
        style={({ pressed }) => [
          styles.myActivityCard,
          filters.myActivityOnly && styles.myActivityCardActive,
          pressed && styles.myActivityCardPressed,
        ]}
        accessibilityRole="switch"
        accessibilityState={{ checked: filters.myActivityOnly }}
        accessibilityLabel="My activity only"
      >
        <View
          style={[
            styles.myActivityIcon,
            filters.myActivityOnly && styles.myActivityIconActive,
          ]}
        >
          <UserRound
            size={18}
            color={
              filters.myActivityOnly
                ? theme.colors.textInverse
                : theme.colors.primary
            }
            strokeWidth={2}
          />
        </View>
        <View style={styles.myActivityTextWrap}>
          <Text style={styles.myActivityTitle}>My activity only</Text>
          <Text style={styles.myActivityDescription}>
            Show transactions involving you
          </Text>
        </View>
        <Switch
          value={filters.myActivityOnly}
          onValueChange={(v) => onChange({ myActivityOnly: v })}
          trackColor={{
            false: theme.colors.neutralSoft,
            true: theme.colors.primary,
          }}
          thumbColor={
            filters.myActivityOnly ? theme.colors.surface : theme.colors.textLight
          }
          ios_backgroundColor={theme.colors.neutralSoft}
        />
      </Pressable>

      {/* ── Date range ──────────────────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>Date range</Text>

      <View style={styles.dateRow}>
        {/* From */}
        <DateField
          label="From"
          value={filters.dateFrom}
          active={activePicker === "from"}
          onPress={() => setActivePicker((p) => (p === "from" ? null : "from"))}
          onClear={() => {
            onChange({ dateFrom: null });
            setActivePicker(null);
          }}
        />

        {/* To — defaults to today when unset */}
        <DateField
          label="To"
          value={filters.dateTo}
          fallbackValue={new Date()}
          active={activePicker === "to"}
          onPress={() => setActivePicker((p) => (p === "to" ? null : "to"))}
          onClear={() => {
            onChange({ dateTo: null });
            setActivePicker(null);
          }}
        />
      </View>

      {/* Native date pickers — only show one at a time.
          Both platforms use display="spinner" (inline) because the sheet is
          already inside a React Native Modal; launching a second native dialog
          from within a Modal silently fails on Android.
          The wrapper enforces a visible height so the spinner doesn't collapse. */}
      {activePicker !== null && (
        <View style={styles.pickerWrap}>
          <DateTimePicker
            value={
              (activePicker === "from" ? filters.dateFrom : filters.dateTo) ??
              new Date()
            }
            mode="date"
            display="spinner"
            textColor={theme.colors.text}
            themeVariant="light"
            minimumDate={
              activePicker === "to" ? filters.dateFrom ?? undefined : undefined
            }
            maximumDate={
              activePicker === "from"
                ? filters.dateTo ?? new Date()
                : new Date()
            }
            onChange={(_, selected) => {
              if (!selected) return;
              if (activePicker === "from") onChange({ dateFrom: selected });
              else onChange({ dateTo: selected });
            }}
            style={styles.picker}
          />
        </View>
      )}

      {/* ── Apply button ────────────────────────────────────────────────── */}
      <Pressable
        style={({ pressed }) => [
          styles.applyBtn,
          pressed && styles.applyBtnPressed,
        ]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Apply filters"
      >
        <Text style={styles.applyBtnLabel}>Apply</Text>
      </Pressable>
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
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
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

  // ── My activity toggle ───────────────────────────────────────────────────
  myActivityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceWarm,
    shadowColor: theme.colors.charcoal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  myActivityCardActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  myActivityCardPressed: {
    opacity: 0.82,
  },
  myActivityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primarySoft,
  },
  myActivityIconActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  myActivityTextWrap: {
    flex: 1,
  },
  myActivityTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text,
  },
  myActivityDescription: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.colors.textMuted,
    marginTop: 2,
  },

  // ── Date range ───────────────────────────────────────────────────────────
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
  dateFieldValueActive: {
    color: theme.colors.primary,
    fontWeight: "600",
  },

  // ── Inline picker ────────────────────────────────────────────────────────
  pickerWrap: {
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background,
    overflow: "hidden",
    alignItems: "stretch",
  },
  picker: {
    width: "100%",
    height: 200,
    backgroundColor: theme.colors.background,
  },

  // ── Apply button ─────────────────────────────────────────────────────────
  applyBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.sm,
  },
  applyBtnPressed: { opacity: 0.8 },
  applyBtnLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});


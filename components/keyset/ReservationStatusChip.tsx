import { StyleSheet, Text, View } from "react-native";
import {
  CalendarCheck,
  CalendarClock,
  CalendarX,
} from "lucide-react-native";

import { theme } from "@/constants";
import type { KeysetAvailability } from "@/lib/utils";

type Props = {
  availability: KeysetAvailability;
};

// ── ReservationStatusChip ─────────────────────────────────────────────────────
// Compact coloured pill displayed on the keyset identity card when there is
// any reservation activity. Not rendered for plain "available" or hard states
// (overdue, missing, inactive) — those are handled by KeyStatusChip already.

export function ReservationStatusChip({ availability }: Props) {
  const { state, label } = availability;

  if (
    state === "available" ||
    state === "checked_out" ||
    state === "overdue" ||
    state === "lost" ||
    state === "inactive"
  ) {
    return null;
  }

  const config = CHIP_CONFIG[state];

  return (
    <View style={[styles.chip, { backgroundColor: config.bg }]}>
      <config.Icon size={11} color={config.color} strokeWidth={2.2} />
      <Text style={[styles.label, { color: config.color }]}>{label}</Text>
    </View>
  );
}

type ChipConfig = {
  bg: string;
  color: string;
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
};

const CHIP_CONFIG: Record<
  "reserved_by_me_now" | "reserved_by_other_now" | "reserved_later",
  ChipConfig
> = {
  reserved_by_me_now: {
    bg: theme.colors.successSoft,
    color: theme.colors.success,
    Icon: CalendarCheck,
  },
  reserved_by_other_now: {
    bg: theme.colors.warningSoft,
    color: theme.colors.warning,
    Icon: CalendarX,
  },
  reserved_later: {
    bg: theme.colors.infoSoft,
    color: theme.colors.info,
    Icon: CalendarClock,
  },
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
  },
});


import { memo, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Clock } from "lucide-react-native";

import { theme } from "@/constants";
import { formatCountdown, formatDateTime, getRemainingTime } from "@/lib/utils";

export type CountdownTimerProps = {
  /** ISO timestamp the timer counts down to. */
  endAt: string;
};

export const CountdownTimer = memo(function CountdownTimer({ endAt }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(() => getRemainingTime(endAt));

  useEffect(() => {
    const tick = () => setRemaining(getRemainingTime(endAt));
    tick();
    // Tick every second when < 1 hour left; every minute otherwise.
    const ms = remaining.total > 0 && remaining.days === 0 && remaining.hours === 0
      ? 1_000
      : 60_000;
    const id = setInterval(tick, ms);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endAt, remaining.days, remaining.hours]);

  const isOverdue = remaining.total <= 0;
  const accent = theme.colors.danger;

  return (
    <View style={[styles.card, isOverdue && styles.cardOverdue]}>
      <View style={styles.topRow}>
        <Clock size={13} color={accent} strokeWidth={2} />
        <Text style={[styles.label, { color: accent }]}>
          {isOverdue ? "Overdue · was due " : "Return by "}
          <Text style={styles.labelDate}>{formatDateTime(endAt)}</Text>
        </Text>
      </View>
      <Text style={[styles.countdown, { color: accent }]}>
        {isOverdue ? "Overdue" : formatCountdown(remaining)}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.dangerSoft,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.danger + "55",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    alignItems: "center",
    gap: 5,
  },
  cardOverdue: {
    backgroundColor: theme.colors.dangerSoft,
    borderColor: theme.colors.danger + "55",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  labelDate: {
    fontWeight: "700",
  },
  countdown: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 1,
    fontVariant: ["tabular-nums"],
    textAlign: "center",
  },
});

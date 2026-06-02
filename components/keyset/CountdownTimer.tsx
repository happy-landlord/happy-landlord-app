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
    // Tick every second when < 1 hour left, every minute otherwise.
    // The interval itself stays stable for the lifetime of `endAt`; the
    // cadence is enforced by recomputing the next-tick delay inside the
    // handler via a small self-rescheduling timeout.
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const tick = () => {
      if (cancelled) return;
      const next = getRemainingTime(endAt);
      setRemaining(next);
      const fastTick =
        next.total > 0 && next.days === 0 && next.hours === 0;
      timeoutId = setTimeout(tick, fastTick ? 1_000 : 60_000);
    };

    tick();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [endAt]);

  const isOverdue = remaining.total <= 0;
  const accent = theme.colors.danger;

  return (
    <View style={styles.card}>
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

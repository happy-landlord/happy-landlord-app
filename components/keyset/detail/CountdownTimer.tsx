import { memo, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Clock } from "lucide-react-native";

import { theme } from "@/constants";
import { formatCountdown, formatDateTime, getRemainingTime } from "@/lib/utils";

export type CountdownTimerProps = {
  /** ISO timestamp the timer counts down to. */
  endAt: string;
};

export const CountdownTimer = memo(function CountdownTimer({
  endAt,
}: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(() => getRemainingTime(endAt));

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const tick = () => {
      if (cancelled) return;
      const next = getRemainingTime(endAt);
      setRemaining(next);
      if (next.total <= 0) return; // Stop ticking once overdue
      const fastTick = next.days === 0 && next.hours === 0;
      timeoutId = setTimeout(tick, fastTick ? 1_000 : 60_000);
    };

    tick();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [endAt]);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Clock size={13} color={theme.colors.warning} strokeWidth={2} />
        <Text style={styles.label}>
          Return by{" "}
          <Text style={styles.labelDate}>{formatDateTime(endAt)}</Text>
        </Text>
      </View>
      <Text style={styles.countdown}>{formatCountdown(remaining)}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.warningSoft,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.warning + "55",
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
    color: theme.colors.warning,
    textAlign: "center",
  },
  labelDate: {
    fontWeight: "700",
  },
  countdown: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 1,
    color: theme.colors.warning,
    fontVariant: ["tabular-nums"],
    textAlign: "center",
  },
});

import { memo, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Clock } from "lucide-react-native";

import { theme } from "@/constants/theme";
import { formatDateTime, formatHMS, getRemainingTime } from "@/lib/format";

export type CountdownTimerProps = {
  /** ISO timestamp the timer counts down to. */
  endAt: string;
};

export const CountdownTimer = memo(function CountdownTimer({ endAt }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(() => getRemainingTime(endAt));

  useEffect(() => {
    setRemaining(getRemainingTime(endAt));
    const id = setInterval(() => setRemaining(getRemainingTime(endAt)), 1000);
    return () => clearInterval(id);
  }, [endAt]);

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
        {isOverdue ? "00:00:00" : formatHMS(remaining)}
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


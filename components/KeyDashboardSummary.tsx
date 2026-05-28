import { StyleSheet, Text, View } from "react-native";
import Svg, { Path, Text as SvgText } from "react-native-svg";

import { theme } from "@/constants/theme";
import { useKeyDashboardCounts } from "@/hooks/useKeySets";
import type { DashboardStatusCount } from "@/services/keys.service";

// ── Status config ─────────────────────────────────────────────────────────────

type StatusConfig = { label: string; color: string };

const STATUS_CONFIG: Record<string, StatusConfig> = {
  available:        { label: "Available",       color: theme.colors.success },
  checked_out:      { label: "Checked out",     color: theme.colors.warning },
  with_tenant:      { label: "With tenant",     color: theme.colors.info },
  overdue:          { label: "Overdue",         color: theme.colors.danger },
  missing_damaged:  { label: "Missing/Damaged", color: theme.colors.textLight },
  with_landlord:    { label: "With landlord",   color: theme.colors.primary },
};

// ── Donut chart helpers ───────────────────────────────────────────────────────

const SIZE = 130;
const OUTER_R = 54;
const INNER_R = 36;
const CX = SIZE / 2;
const CY = SIZE / 2;
const CENTER_TOTAL_Y = CY - 7;
const CENTER_LABEL_Y = CY + 12;
const GAP_DEG = 2; // small gap between segments

function toRad(deg: number) {
  return ((deg - 90) * Math.PI) / 180;
}

function arcPath(
  startDeg: number,
  endDeg: number,
): string {
  // Guard: if segment is nearly 360, cap slightly to avoid degenerate arc
  const effectiveEnd = endDeg - startDeg >= 359.9 ? startDeg + 359.9 : endDeg;

  const x1 = CX + OUTER_R * Math.cos(toRad(startDeg));
  const y1 = CY + OUTER_R * Math.sin(toRad(startDeg));
  const x2 = CX + OUTER_R * Math.cos(toRad(effectiveEnd));
  const y2 = CY + OUTER_R * Math.sin(toRad(effectiveEnd));
  const x3 = CX + INNER_R * Math.cos(toRad(effectiveEnd));
  const y3 = CY + INNER_R * Math.sin(toRad(effectiveEnd));
  const x4 = CX + INNER_R * Math.cos(toRad(startDeg));
  const y4 = CY + INNER_R * Math.sin(toRad(startDeg));

  const large = effectiveEnd - startDeg > 180 ? 1 : 0;

  return [
    `M ${x1} ${y1}`,
    `A ${OUTER_R} ${OUTER_R} 0 ${large} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${INNER_R} ${INNER_R} 0 ${large} 0 ${x4} ${y4}`,
    "Z",
  ].join(" ");
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DonutChart({
  rows,
  total,
}: {
  rows: DashboardStatusCount[];
  total: number;
}) {
  const nonZero = rows.filter((r) => r.count > 0);
  const useGap = nonZero.length > 1;

  let cursor = 0;
  const segments = nonZero.map((r) => {
    const span = (r.count / total) * 360;
    const startDeg = cursor + (useGap ? GAP_DEG / 2 : 0);
    const endDeg = cursor + span - (useGap ? GAP_DEG / 2 : 0);
    cursor += span;
    const cfg = STATUS_CONFIG[r.dashboard_status];
    return { path: arcPath(startDeg, endDeg), color: cfg?.color ?? theme.colors.border };
  });

  return (
    <View style={styles.chartWrap}>
      <Svg width={SIZE} height={SIZE}>
        {segments.map((seg, i) => (
          <Path key={i} d={seg.path} fill={seg.color} />
        ))}
        {/* Center total */}
        <SvgText
          x={CX}
          y={CENTER_TOTAL_Y}
          textAnchor="middle"
          alignmentBaseline="middle"
          fontSize={22}
          fontWeight="800"
          fill={theme.colors.text}
        >
          {total}
        </SvgText>
        <SvgText
          x={CX}
          y={CENTER_LABEL_Y}
          textAnchor="middle"
          alignmentBaseline="middle"
          fontSize={11}
          fontWeight="600"
          fill={theme.colors.textLight}
        >
          Total
        </SvgText>
      </Svg>
    </View>
  );
}

function Legend({ rows }: { rows: DashboardStatusCount[] }) {
  return (
    <View style={styles.legend}>
      {rows.map((r) => {
        const cfg = STATUS_CONFIG[r.dashboard_status];
        if (!cfg) return null;
        return (
          <View key={r.dashboard_status} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: cfg.color }]} />
            <Text style={styles.legendCount}>{r.count}</Text>
            <Text style={styles.legendLabel} numberOfLines={1}>{cfg.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function KeyDashboardSummary() {
  const { data = [], isLoading, isError, error } = useKeyDashboardCounts();

  const total = data.reduce((s, r) => s + r.count, 0);

  if (isLoading) {
    return (
      <View style={styles.card}>
        <Text style={styles.placeholder}>Loading…</Text>
      </View>
    );
  }

  if (isError) {
    const msg = error instanceof Error ? error.message : String(error);
    return (
      <View style={styles.card}>
        <Text style={styles.placeholder}>
          {__DEV__ ? `Error: ${msg}` : "Could not load counts."}
        </Text>
      </View>
    );
  }

  if (total === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.placeholder}>No keys registered.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.body}>
        <DonutChart rows={data} total={total} />
        <Legend rows={data} />
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  body: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  chartWrap: {
    width: SIZE,
    height: SIZE,
    flexShrink: 0,
  },
  placeholder: {
    fontSize: 13,
    color: theme.colors.textLight,
    paddingVertical: theme.spacing.sm,
  },

  // ── Legend ────────────────────────────────────────────────────────────────
  legend: {
    flex: 1,
    gap: 8,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  legendCount: {
    fontSize: 14,
    fontWeight: "800",
    color: theme.colors.text,
    minWidth: 26,
  },
  legendLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.textMuted,
  },
});

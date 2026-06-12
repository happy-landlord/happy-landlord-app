import { StyleSheet, Text, View } from "react-native";
import Svg, { Path, Text as SvgText } from "react-native-svg";

import { theme } from "@/constants";
import { useAdminDashboardSummary } from "@/lib/hooks";
import type { AdminDashboardSummary } from "@/lib/services";

// ── Donut chart ───────────────────────────────────────────────────────────────

const SIZE = 130;
const OUTER_R = 54;
const INNER_R = 36;
const CX = SIZE / 2;
const CY = SIZE / 2;
const GAP_DEG = 2;

function toRad(deg: number) {
  return ((deg - 90) * Math.PI) / 180;
}

function arcPath(startDeg: number, endDeg: number): string {
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

type Segment = { label: string; value: number; color: string };

function DonutChart({
  segments,
  total,
}: {
  segments: Segment[];
  total: number;
}) {
  const nonZero = segments.filter((s) => s.value > 0);
  const useGap = nonZero.length > 1;
  let cursor = 0;
  const paths = nonZero.map((s) => {
    const span = (s.value / total) * 360;
    const startDeg = cursor + (useGap ? GAP_DEG / 2 : 0);
    const endDeg = cursor + span - (useGap ? GAP_DEG / 2 : 0);
    cursor += span;
    return { path: arcPath(startDeg, endDeg), color: s.color };
  });

  return (
    <Svg width={SIZE} height={SIZE}>
      {paths.map((p, i) => (
        <Path key={i} d={p.path} fill={p.color} fillOpacity={0.75} />
      ))}
      <SvgText
        x={CX}
        y={CY - 7}
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
        y={CY + 12}
        textAnchor="middle"
        alignmentBaseline="middle"
        fontSize={11}
        fontWeight="600"
        fill={theme.colors.textLight}
      >
        Keysets
      </SvgText>
    </Svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildSegments(d: AdminDashboardSummary): Segment[] {
  return [
    {
      label: "Available",
      value: d.available_keysets,
      color: theme.colors.success,
    },
    {
      label: "Checked out",
      value: d.checked_out_keysets,
      color: theme.colors.info,
    },
    {
      label: "Overdue",
      value: d.overdue_keysets,
      color: theme.colors.danger,
    },
    {
      label: "Lost/Damaged",
      value: d.lost_keysets,
      color: theme.colors.warning,
    },
  ];
}

// ── Property stats banner ─────────────────────────────────────────────────────

export function PropertyStatsBanner() {
  const { data, isLoading, isError } = useAdminDashboardSummary();

  if (isLoading || isError || !data) return null;

  return (
    <View style={styles.statsRow}>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{data.total_properties}</Text>
        <Text style={styles.statLabel}>Properties</Text>
      </View>
      <View style={[styles.statCard, styles.statCardAccent]}>
        <Text style={[styles.statValue, { color: theme.colors.info }]}>
          {data.leased_properties}
        </Text>
        <Text style={styles.statLabel}>Leased</Text>
      </View>
      <View style={[styles.statCard, styles.statCardNeutral]}>
        <Text style={[styles.statValue, { color: theme.colors.neutral }]}>
          {data.inactive_properties}
        </Text>
        <Text style={styles.statLabel}>Inactive</Text>
      </View>
    </View>
  );
}

// ── Keyset donut summary ──────────────────────────────────────────────────────

export function KeyDashboardSummary() {
  const { data, isLoading, isError } = useAdminDashboardSummary();

  if (isLoading) {
    return (
      <View style={styles.card}>
        <Text style={styles.placeholder}>Loading…</Text>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.card}>
        <Text style={styles.placeholder}>Could not load summary.</Text>
      </View>
    );
  }

  const segments = buildSegments(data);
  const total = data.total_keysets;

  return (
    <View style={styles.card}>
      <View style={styles.chartRow}>
        <View style={styles.chartWrap}>
          <DonutChart segments={segments} total={total} />
        </View>
        <View style={styles.legend}>
          {segments.map((s) => (
            <View key={s.label} style={styles.legendRow}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: s.color, opacity: 0.75 },
                ]}
              />
              <Text style={[styles.legendCount, { color: s.color }]}>
                {s.value}
              </Text>
              <Text style={styles.legendLabel} numberOfLines={1}>
                {s.label}
              </Text>
            </View>
          ))}
        </View>
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
    gap: theme.spacing.sm,
  },
  placeholder: {
    fontSize: 13,
    color: theme.colors.textLight,
    paddingVertical: theme.spacing.sm,
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  chartWrap: {
    width: SIZE,
    height: SIZE,
    flexShrink: 0,
  },
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
    minWidth: 26,
  },
  legendLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.textMuted,
  },
  // ── Property stats banner ───────────────────────────────────────────────────
  statsRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    paddingVertical: theme.spacing.md,
    gap: 4,
  },
  statCardAccent: {
    borderColor: theme.colors.infoSoft,
    backgroundColor: theme.colors.infoSoft,
  },
  statCardNeutral: {
    borderColor: theme.colors.neutralSoft,
    backgroundColor: theme.colors.neutralSoft,
  },
  statValue: {
    fontSize: 32,
    fontWeight: "800",
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
});

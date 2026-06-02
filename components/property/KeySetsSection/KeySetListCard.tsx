import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight, KeyRound } from "lucide-react-native";
import type { ReactNode } from "react";

import { formatDateTime, getTotalKeyQuantity } from "@/lib/utils";
import type { KeySetCardTone } from "@/lib/utils";
import { theme } from "@/constants";
import type { KeySetWithDetails } from "@/lib/services";

// ── KeySetListCard ───────────────────────────────────────────────────────────
// Shared list-card chrome used by the admin keysets list. Renders the
// icon + status row + title + an optional meta block (typically the
// `KeySetHolderMeta` companion below) and a chevron CTA.

export type KeySetListCardProps = {
  keySet: KeySetWithDetails;
  tone: KeySetCardTone;
  showCode?: boolean;
  meta?: ReactNode;
  status?: ReactNode;
  right?: ReactNode;
  onPress: () => void;
};

export function KeySetListCard({
  keySet,
  tone,
  showCode = false,
  meta,
  status,
  right,
  onPress,
}: KeySetListCardProps) {
  const totalKeys = getTotalKeyQuantity(keySet);
  const keyCountLabel = `${totalKeys} ${totalKeys === 1 ? "key" : "keys"}`;
  const hasMeta = !!meta || !!right;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={keySet.name}
    >
      <View style={[styles.cardAccent, toneAccent[tone]]} />
      <View style={styles.cardTopRow}>
        <View style={[styles.cardIconWrap, toneIconWrap[tone]]}>
          <KeyRound size={18} color={toneColor[tone]} strokeWidth={1.8} />
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.cardStatusRow}>
            {status}
            <KeyCountPill label={keyCountLabel} />
          </View>
          <View style={styles.cardTitleBlock}>
            <Text style={styles.cardName} numberOfLines={2}>
              {keySet.name}
            </Text>
            {showCode && (
              <Text style={styles.cardCode} numberOfLines={1}>
                {keySet.code}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.cardChevronWrap}>
          <ChevronRight
            size={18}
            color={theme.colors.textLight}
            strokeWidth={2}
          />
        </View>
      </View>

      {hasMeta && (
        <View style={styles.cardMetaRow}>
          <View style={styles.cardMetaDivider} />
          <View style={styles.cardMetaContent}>
            {meta}
            {right ? <View style={styles.cardRight}>{right}</View> : null}
          </View>
        </View>
      )}
    </Pressable>
  );
}

// ── Sub-pieces ───────────────────────────────────────────────────────────────

export function KeyCountPill({ label }: { label: string }) {
  return (
    <View style={styles.rightCountPill}>
      <Text style={styles.rightCountText}>{label}</Text>
    </View>
  );
}

export function KeySetHolderMeta({
  holderName,
  dueBackAt,
  overdue,
}: {
  holderName: string;
  dueBackAt?: string | null;
  overdue: boolean;
}) {
  return (
    <>
      <View style={styles.metaItem}>
        <Text style={styles.metaLabel}>With</Text>
        <Text
          style={[styles.metaValue, overdue && styles.metaValueDanger]}
          numberOfLines={1}
        >
          {holderName}
        </Text>
      </View>
      {dueBackAt && (
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Due Date</Text>
          <Text
            style={[styles.metaValue, overdue && styles.metaValueDanger]}
            numberOfLines={1}
          >
            {overdue
              ? `Overdue · ${formatDateTime(dueBackAt)}`
              : formatDateTime(dueBackAt)}
          </Text>
        </View>
      )}
    </>
  );
}

// ── Tone tables ──────────────────────────────────────────────────────────────

const toneColor: Record<KeySetCardTone, string> = {
  available: theme.colors.success,
  warning: theme.colors.warning,
  danger: theme.colors.danger,
  info: theme.colors.info,
};

const toneIconWrap: Record<KeySetCardTone, { backgroundColor: string }> = {
  available: { backgroundColor: theme.colors.successSoft },
  warning: { backgroundColor: theme.colors.warningSoft },
  danger: { backgroundColor: theme.colors.dangerSoft },
  info: { backgroundColor: theme.colors.infoSoft },
};

const toneAccent: Record<KeySetCardTone, { backgroundColor: string }> = {
  available: { backgroundColor: theme.colors.success },
  warning: { backgroundColor: theme.colors.warning },
  danger: { backgroundColor: theme.colors.danger },
  info: { backgroundColor: theme.colors.info },
};

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    flexDirection: "column",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    overflow: "hidden",
    position: "relative",
  },
  cardPressed: { opacity: 0.72 },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 8,
  },
  cardAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4 },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    backgroundColor: theme.colors.neutralSoft,
    marginLeft: 2,
  },
  cardInfo: { flex: 1, minWidth: 0, gap: 4 },
  cardStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  cardTitleBlock: { flex: 1, minWidth: 0, gap: 1 },
  cardName: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.colors.text,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  cardCode: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.colors.textMuted,
    letterSpacing: 0.2,
  },
  cardRight: { alignItems: "flex-end", justifyContent: "center" },
  cardMetaRow: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  cardMetaDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  cardMetaContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
  },
  cardChevronWrap: {
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rightCountPill: {
    minHeight: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.neutralSoft,
  },
  rightCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  metaItem: { flex: 1, gap: 2 },
  metaLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  metaValue: { fontSize: 13, fontWeight: "600", color: theme.colors.text },
  metaValueDanger: { color: theme.colors.danger },
});


import { StyleSheet, Text, View } from "react-native";
import { Clock3 } from "lucide-react-native";

import { Card, IconBadge } from "@/components/ui";
import { theme, MOVEMENT_CONFIG, getMovementLabel } from "@/constants";
import { useCurrentUserId } from "@/lib/hooks";
import {
  formatActivityTimestamp,
  formatShortAddress,
  formatTime,
} from "@/lib/utils";
import type { ActivityTransaction } from "@/types";

// ── HistoryListItem ───────────────────────────────────────────────────────────
// Shared transaction renderers.
//
// Two layout modes:
//   • `HistoryCard` — large bordered card with title, time (top-right),
//             address, keyset name and notes. Used by the History tab where
//             a transaction log is the primary content.
//   • `ActivityRow` — tight inline row with an icon, label and
//             `Clock3 + time` meta. Used by the agent "My Activity" tab and
//             by the keyset "Last Activity" section. Optional `divider` to
//             draw a 1px separator below the row when stacked in a host card.

type CommonProps = {
  item: ActivityTransaction;
};

export type HistoryCardProps = CommonProps & {
  /** Include the keyset short code alongside the name (admin view). */
  showKeySetCode?: boolean;
};

export type ActivityRowProps = CommonProps & {
  /** Show the property address subtitle. Defaults to true. */
  showAddress?: boolean;
  /** Draw a 1px bottom separator (for stacked rows inside a host card). */
  divider?: boolean;
  /**
   * When true, always show the plain action label (e.g. "Checked Out")
   * without "You" prefix or actor name. Used in the agent's own activity list.
   */
  plain?: boolean;
};

// ── Card variant ─────────────────────────────────────────────────────────────

export function HistoryCard({ item, showKeySetCode = false }: HistoryCardProps) {
  const currentUserId = useCurrentUserId();
  const movement = MOVEMENT_CONFIG[item.transaction_type];
  const label = getMovementLabel(item, currentUserId);
  const propertyLine = formatShortAddress(item.property);
  const keysLine = item.key_set
    ? showKeySetCode
      ? `${item.key_set.name} (${item.key_set.code})`
      : item.key_set.name
    : null;

  return (
    <Card style={cardStyles.card}>
      <IconBadge
        icon={movement.Icon}
        size="md"
        background={movement.bg}
        iconColor={movement.color}
        strokeWidth={2}
      />
      <View style={cardStyles.body}>
        <View style={cardStyles.topRow}>
          <Text style={cardStyles.label} numberOfLines={2}>
            {label}
          </Text>
          <Text style={cardStyles.time}>{formatTime(item.created_at)}</Text>
        </View>
        <Text style={cardStyles.address} numberOfLines={1}>
          {propertyLine}
        </Text>
        {keysLine ? (
          <Text style={cardStyles.keys} numberOfLines={2}>
            {keysLine}
          </Text>
        ) : null}
        {item.notes ? (
          <Text style={cardStyles.notes} numberOfLines={2}>
            {item.notes}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

// ── Row variant ──────────────────────────────────────────────────────────────

export function ActivityRow({
  item,
  showAddress = true,
  divider = false,
  plain = false,
}: ActivityRowProps) {
  const currentUserId = useCurrentUserId();
  const movement = MOVEMENT_CONFIG[item.transaction_type];
  const label = plain ? movement.label : getMovementLabel(item, currentUserId);
  const address = showAddress ? formatShortAddress(item.property) : null;

  return (
    <View style={[rowStyles.row, divider && rowStyles.divider]}>
      <IconBadge
        icon={movement.Icon}
        size="sm"
        background={movement.bg}
        iconColor={movement.color}
        strokeWidth={2}
      />
      <View style={rowStyles.body}>
        <Text style={rowStyles.label} numberOfLines={1}>
          {label}
        </Text>
        {address ? (
          <Text style={rowStyles.subtitle} numberOfLines={1}>
            {address}
          </Text>
        ) : null}
        <View style={rowStyles.metaRow}>
          <Clock3 size={11} color={theme.colors.textLight} strokeWidth={2} />
          <Text style={rowStyles.meta} numberOfLines={1}>
            {formatActivityTimestamp(item.created_at)}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  body: { flex: 1, gap: 2 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  label: { fontSize: 14, fontWeight: "600", color: theme.colors.text },
  time: { fontSize: 12, color: theme.colors.textLight },
  address: { fontSize: 13, color: theme.colors.text, fontWeight: "500" },
  keys: { fontSize: 12, color: theme.colors.textMuted, fontWeight: "500" },
  notes: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginTop: 4,
    fontStyle: "italic",
  },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 11,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  body: { flex: 1, gap: 3, minWidth: 0 },
  label: { fontSize: 13, fontWeight: "600", color: theme.colors.text },
  subtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.colors.textMuted,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  meta: {
    fontSize: 11,
    fontWeight: "500",
    color: theme.colors.textLight,
  },
});


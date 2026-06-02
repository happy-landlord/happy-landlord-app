import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants";
import { formatNotificationTimestamp } from "@/lib/utils";
import { getNotificationRowTargetPath } from "@/lib/services";
import { getNotificationVisual } from "./notificationVisuals";
import type { DbNotification } from "@/types";

// ── NotificationCard ─────────────────────────────────────────────────────────
// Single-row presentation of a `DbNotification`. The parent screen passes a
// stable `onPress(id)` so memoization isn't broken on every list re-render.

export type NotificationCardProps = {
  notification: DbNotification;
  onPress: (id: string) => void;
};

export function NotificationCard({
  notification,
  onPress,
}: NotificationCardProps) {
  const unread = !notification.read_at;
  const visual = getNotificationVisual(notification.type);
  const Icon = visual.Icon;
  const target = getNotificationRowTargetPath(notification);

  return (
    <Pressable
      onPress={() => onPress(notification.id)}
      style={({ pressed }) => [
        styles.card,
        unread && styles.cardUnread,
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
    >
      <View style={[styles.iconBadge, { backgroundColor: visual.bg }]}>
        <Icon size={18} color={visual.color} strokeWidth={2} />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <View style={styles.typePill}>
            <Text style={[styles.typeText, { color: visual.color }]}>
              {visual.label}
            </Text>
          </View>
          <Text style={styles.timeText}>
            {formatNotificationTimestamp(notification.created_at)}
          </Text>
        </View>

        <Text style={styles.titleText} numberOfLines={2}>
          {notification.title}
        </Text>
        <Text style={styles.bodyText} numberOfLines={3}>
          {notification.body}
        </Text>

        <View style={styles.footerRow}>
          {unread ? (
            <View style={styles.unreadRow}>
              <View style={styles.unreadDot} />
              <Text style={styles.unreadText}>Unread</Text>
            </View>
          ) : (
            <Text style={styles.readText}>Read</Text>
          )}
          {target ? <Text style={styles.openText}>Open</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: theme.spacing.md,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
  },
  cardUnread: {
    backgroundColor: theme.colors.surfaceWarm,
    borderColor: theme.colors.primarySoft,
  },
  cardPressed: { opacity: 0.75 },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardBody: { flex: 1, gap: 5 },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  typePill: {
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.neutralSoft,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
  },
  typeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  timeText: { fontSize: 12, color: theme.colors.textLight },
  titleText: { fontSize: 15, fontWeight: "700", color: theme.colors.text },
  bodyText: { fontSize: 13, color: theme.colors.textMuted, lineHeight: 19 },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  unreadRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  unreadText: { fontSize: 12, color: theme.colors.primary, fontWeight: "700" },
  readText: { fontSize: 12, color: theme.colors.textLight, fontWeight: "600" },
  openText: { fontSize: 12, color: theme.colors.primary, fontWeight: "700" },
});


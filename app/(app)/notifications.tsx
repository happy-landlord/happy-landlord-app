import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  AlertTriangle,
  Bell,
  Clock,
  FlaskConical,
  KeyRound,
  LogIn,
  RotateCcw,
  UserPlus,
} from "lucide-react-native";

import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { theme } from "@/constants/theme";
import { formatNotificationTimestamp } from "@/lib/format";
import { useCurrentUserId } from "@/hooks/useSession";
import {
  useAdminSendTestNotification,
  useMarkNotificationRead,
  useNotifications,
} from "@/hooks/useNotifications";
import { useRole } from "@/hooks/useRole";
import {
  getNotificationRowTargetPath,
  NOTIFICATION_TYPES,
  type AppNotification,
} from "@/services/notifications.service";
import type { NotificationType } from "@/types/database";

type NotificationVisual = {
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  color: string;
  bg: string;
};

const NOTIFICATION_VISUALS: Record<NotificationType, NotificationVisual> = {
  KEY_CHECKOUT_CREATED: {
    label: "Keyset checkout",
    Icon: KeyRound,
    color: theme.colors.info,
    bg: theme.colors.infoSoft,
  },
  KEY_DUE_SOON: {
    label: "Due soon",
    Icon: Clock,
    color: theme.colors.warning,
    bg: theme.colors.warningSoft,
  },
  KEY_OVERDUE: {
    label: "Overdue",
    Icon: AlertTriangle,
    color: theme.colors.danger,
    bg: theme.colors.dangerSoft,
  },
  KEY_RETURNED: {
    label: "Returned",
    Icon: LogIn,
    color: theme.colors.success,
    bg: theme.colors.successSoft,
  },
  KEY_LOST_REPORTED: {
    label: "Lost keyset",
    Icon: AlertTriangle,
    color: theme.colors.danger,
    bg: theme.colors.dangerSoft,
  },
  USER_REGISTRATION_REQUESTED: {
    label: "Registration",
    Icon: UserPlus,
    color: theme.colors.primary,
    bg: theme.colors.primarySoft,
  },
  KEY_RECALL_REQUESTED: {
    label: "Recall requested",
    Icon: RotateCcw,
    color: theme.colors.warning,
    bg: theme.colors.warningSoft,
  },
};

function isKnownNotificationType(value: string): value is NotificationType {
  return Object.values(NOTIFICATION_TYPES).includes(value as NotificationType);
}

function getVisual(type: string): NotificationVisual {
  if (isKnownNotificationType(type)) {
    return NOTIFICATION_VISUALS[type];
  }

  return {
    label: "Notification",
    Icon: Bell,
    color: theme.colors.neutral,
    bg: theme.colors.neutralSoft,
  };
}

export default function NotificationsScreen() {
  const router = useRouter();
  const userId = useCurrentUserId();
  const { isAdmin } = useRole();
  const { data, isLoading, isError, isFetching, refetch } = useNotifications();
  const markRead = useMarkNotificationRead();

  const handlePress = useCallback(
    (notification: AppNotification) => {
      // Fire-and-forget — optimistic update patches the cache instantly so the
      // card flips to "read" without any server-round-trip re-render.
      if (!notification.read_at) {
        markRead.mutate(notification.id);
      }

      const target = getNotificationRowTargetPath(notification);
      if (target) {
        router.push(target as never);
      }
    },
    [markRead, router]
  );

  const renderItem = useCallback(
    ({ item }: { item: AppNotification }) => (
      <NotificationCard notification={item} onPress={() => handlePress(item)} />
    ),
    [handlePress]
  );

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <LoadingState message="Loading notifications…" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.screen}>
        <ErrorState
          title="Couldn't load notifications"
          message="Check your connection and try again."
          onRetry={refetch}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={[
          styles.list,
          (!data || data.length === 0) && !isAdmin && styles.listEmpty,
        ]}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />
        }
        ListHeaderComponent={
          isAdmin && userId ? (
            <AdminTestPanel userId={userId} />
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            Icon={Bell}
            title="No notifications"
            message="Updates about keysets, checkouts, recalls, and registration requests will appear here."
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// ── Admin test panel ──────────────────────────────────────────────────────────

const TEST_TYPES = Object.values(NOTIFICATION_TYPES) as NotificationType[];

function AdminTestPanel({ userId }: { userId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState("Test push notification");
  const [body, setBody] = useState("This is a test push — sent from the admin panel.");
  const [selectedType, setSelectedType] = useState<NotificationType>("KEY_CHECKOUT_CREATED");

  const sendTest = useAdminSendTestNotification();

  async function handleSend() {
    try {
      await sendTest.mutateAsync({
        recipientUserId: userId,
        title: title.trim() || "Test notification",
        body: body.trim() || "Test body",
        type: selectedType,
      });
      Alert.alert("✅ Test sent", "Notification created and push dispatched to your device.");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      Alert.alert("Error", message);
    }
  }

  return (
    <View style={testStyles.container}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [testStyles.header, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
        accessibilityLabel={expanded ? "Collapse admin test panel" : "Expand admin test panel"}
      >
        <View style={testStyles.headerLeft}>
          <FlaskConical size={16} color={theme.colors.warning} strokeWidth={2} />
          <Text style={testStyles.headerTitle}>Admin — Push Test</Text>
        </View>
        <Text style={testStyles.toggle}>{expanded ? "▲" : "▼"}</Text>
      </Pressable>

      {expanded ? (
        <View style={testStyles.body}>
          <Text style={testStyles.label}>Title</Text>
          <TextInput
            style={testStyles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Notification title"
            placeholderTextColor={theme.colors.textLight}
            returnKeyType="next"
          />

          <Text style={testStyles.label}>Body</Text>
          <TextInput
            style={[testStyles.input, testStyles.inputMultiline]}
            value={body}
            onChangeText={setBody}
            placeholder="Notification body"
            placeholderTextColor={theme.colors.textLight}
            multiline
            numberOfLines={3}
            returnKeyType="done"
          />

          <Text style={testStyles.label}>Type</Text>
          <View style={testStyles.typeGrid}>
            {TEST_TYPES.map((t) => (
              <Pressable
                key={t}
                onPress={() => setSelectedType(t)}
                style={({ pressed }) => [
                  testStyles.typeChip,
                  t === selectedType && testStyles.typeChipActive,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text
                  style={[
                    testStyles.typeChipText,
                    t === selectedType && testStyles.typeChipTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {t}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={handleSend}
            disabled={sendTest.isPending}
            style={({ pressed }) => [
              testStyles.sendBtn,
              (pressed || sendTest.isPending) && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Send test push notification"
          >
            {sendTest.isPending ? (
              <ActivityIndicator size="small" color={theme.colors.textInverse} />
            ) : (
              <Text style={testStyles.sendBtnText}>Send test push →</Text>
            )}
          </Pressable>

          <Text style={testStyles.note}>
            ⚠️ Sends to your own device only. Push payload omits full property addresses.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const testStyles = StyleSheet.create({
  container: {
    borderRadius: theme.radius.card,
    borderWidth: 1.5,
    borderColor: theme.colors.warningSoft,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.md,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2,
    backgroundColor: theme.colors.warningSoft,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.warning,
    letterSpacing: 0.2,
  },
  toggle: {
    fontSize: 11,
    color: theme.colors.warning,
    fontWeight: "700",
  },
  body: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: -theme.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 14,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
  },
  inputMultiline: {
    minHeight: 64,
    textAlignVertical: "top",
    paddingTop: theme.spacing.sm,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  typeChip: {
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    backgroundColor: theme.colors.neutralSoft,
  },
  typeChipActive: {
    borderColor: theme.colors.warning,
    backgroundColor: theme.colors.warningSoft,
  },
  typeChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.textMuted,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  typeChipTextActive: {
    color: theme.colors.warning,
  },
  sendBtn: {
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.warning,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.sm + 2,
    marginTop: theme.spacing.xs,
  },
  sendBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.textInverse,
  },
  note: {
    fontSize: 11,
    color: theme.colors.textLight,
    lineHeight: 16,
    marginTop: theme.spacing.xs,
  },
});

// ── Notification card ──────────────────────────────────────────────────────────

function NotificationCard({
  notification,
  onPress,
}: {
  notification: AppNotification;
  onPress: () => void;
}) {
  const unread = !notification.read_at;
  const visual = getVisual(notification.type);
  const Icon = visual.Icon;
  const target = getNotificationRowTargetPath(notification);

  return (
    <Pressable
      onPress={onPress}
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
          <Text style={styles.timeText}>{formatNotificationTimestamp(notification.created_at)}</Text>
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
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  list: {
    padding: theme.spacing.screen,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: "center",
  },
  separator: {
    height: theme.spacing.md,
  },
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
  cardPressed: {
    opacity: 0.75,
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
    gap: 5,
  },
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
  timeText: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  titleText: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text,
  },
  bodyText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 19,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  unreadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  unreadText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: "700",
  },
  readText: {
    fontSize: 12,
    color: theme.colors.textLight,
    fontWeight: "600",
  },
  openText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: "700",
  },
});


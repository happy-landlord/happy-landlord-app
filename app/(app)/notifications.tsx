import { useCallback } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Bell } from "lucide-react-native";

import {
  AdminPushTestPanel,
  NotificationCard,
} from "@/components/notification";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui";
import { theme } from "@/constants";
import { useRole } from "@/hooks";
import {
  useMarkNotificationRead,
  useNotifications,
} from "@/lib/hooks";
import { getNotificationRowTargetPath } from "@/lib/services";
import type { DbNotification } from "@/types";

export default function NotificationsScreen() {
  const router = useRouter();
  const { isAdmin } = useRole();
  const { data, isLoading, isError, isFetching, refetch } = useNotifications();
  const markRead = useMarkNotificationRead();

  // Stable handler keyed by id — keeps NotificationCard memo-friendly when
  // the list grows (cards no longer re-render when an unrelated cache slot
  // changes).
  const handlePress = useCallback(
    (id: string) => {
      const notification = (data ?? []).find((n) => n.id === id);
      if (!notification) return;
      if (!notification.read_at) markRead.mutate(notification.id);
      const target = getNotificationRowTargetPath(notification);
      if (target) router.push(target as never);
    },
    [data, markRead, router],
  );

  const renderItem = useCallback(
    ({ item }: { item: DbNotification }) => (
      <NotificationCard notification={item} onPress={handlePress} />
    ),
    [handlePress],
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
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
          />
        }
        ListHeaderComponent={isAdmin ? <AdminPushTestPanel /> : null}
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  list: {
    padding: theme.spacing.screen,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  listEmpty: { flexGrow: 1, justifyContent: "center" },
  separator: { height: theme.spacing.md },
});

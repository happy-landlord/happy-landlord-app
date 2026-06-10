import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Building2, KeyRound } from "lucide-react-native";
import { useRouter } from "expo-router";

import { ActivityRow } from "@/components/history";
import {
  KeySetPropertyCard,
  KeySetReservedCard,
} from "@/components/keyset";
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionHeader,
} from "@/components/ui";
import {
  useCheckedOutKeySets,
  useCurrentUserId,
  useInfiniteCheckedOut,
  useInfiniteHistory,
  useInfiniteNeedsAttention,
  useMyReservations,
} from "@/lib/hooks";
import { useRole } from "@/hooks";
import { theme, useBottomListPadding } from "@/constants";
import type {
  CheckedOutKeySet,
  KeySetNeedingAttention,
} from "@/lib/services";
import type { ActivityTransaction } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function sortByDueDate(keys: CheckedOutKeySet[]): CheckedOutKeySet[] {
  return [...keys].sort((a, b) => {
    if (!a.due_back_at && !b.due_back_at) return 0;
    if (!a.due_back_at) return 1;
    if (!b.due_back_at) return -1;
    return a.due_back_at.localeCompare(b.due_back_at);
  });
}


// ── Admin tab config ──────────────────────────────────────────────────────────

type AdminTab = "checked_out" | "needs_attention";

const ADMIN_TABS = [
  { key: "needs_attention" as const, label: "Needs Attention" },
  { key: "checked_out" as const, label: "Checked Out" },
];

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ActivityScreen() {
  const { isAdmin, isLoading } = useRole();

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <LoadingState message="Loading…" />
      </View>
    );
  }

  return isAdmin ? <AdminActivityView /> : <AgentActivityView />;
}

// ── Admin view ────────────────────────────────────────────────────────────────

function AdminActivityView() {
  const [activeTab, setActiveTab] = useState<AdminTab>("needs_attention");
  const listPaddingBottom = useBottomListPadding();

  return (
    <View style={styles.screen}>
      {/* Tab strip — matches Properties page Active/Leased/Inactive style */}
      <View style={tabStyles.strip}>
        {ADMIN_TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[tabStyles.btn, active && tabStyles.btnActive]}
              onPress={() => setActiveTab(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text style={[tabStyles.label, active && tabStyles.labelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {activeTab === "checked_out" ? (
        <CheckedOutTab paddingBottom={listPaddingBottom} />
      ) : (
        <NeedsAttentionTab paddingBottom={listPaddingBottom} />
      )}
    </View>
  );
}

// ── Admin: Checked Out tab ────────────────────────────────────────────────────

function CheckedOutTab({ paddingBottom }: { paddingBottom: number }) {
  const router = useRouter();
  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteCheckedOut();

  const items = useMemo(
    () => (data?.pages.flat() ?? []) as CheckedOutKeySet[],
    [data],
  );

  const renderItem = useCallback(
    ({ item }: { item: CheckedOutKeySet }) => (
      <KeySetPropertyCard
        item={item}
        hideCheckedOutBadge
        onPress={() =>
          router.push(`/(app)/properties/keyset/${item.id}` as never)
        }
      />
    ),
    [router],
  );

  const renderFooter = useCallback(
    () =>
      isFetchingNextPage ? (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      ) : null,
    [isFetchingNextPage],
  );

  if (isLoading)
    return (
      <View style={styles.stateArea}>
        <LoadingState message="Loading checked out keysets…" />
      </View>
    );
  if (isError)
    return (
      <View style={styles.stateArea}>
        <ErrorState
          title="Couldn't load keysets"
          message="Check your connection and try again."
          onRetry={refetch}
        />
      </View>
    );

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[
        styles.listContent,
        { paddingBottom },
        items.length === 0 && styles.listEmpty,
      ]}
      refreshControl={
        <RefreshControl
          refreshing={isFetching && !isLoading}
          onRefresh={refetch}
        />
      }
      onEndReached={() => {
        if (hasNextPage) fetchNextPage();
      }}
      onEndReachedThreshold={0.3}
      ListEmptyComponent={
        <EmptyState
          Icon={KeyRound}
          title="All clear"
          message="No keysets are currently checked out."
        />
      }
      ListFooterComponent={renderFooter}
      renderItem={renderItem}
      ItemSeparatorComponent={() => <View style={styles.itemSep} />}
      showsVerticalScrollIndicator={false}
    />
  );
}

// ── Admin: Needs Attention tab ────────────────────────────────────────────────

function NeedsAttentionTab({ paddingBottom }: { paddingBottom: number }) {
  const router = useRouter();
  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteNeedsAttention();

  const items = useMemo(
    () => (data?.pages.flat() ?? []) as KeySetNeedingAttention[],
    [data],
  );

  const renderItem = useCallback(
    ({ item }: { item: KeySetNeedingAttention }) => (
      <KeySetPropertyCard
        item={item}
        hideCheckedOutBadge
        onPress={() =>
          router.push(`/(app)/properties/keyset/${item.id}` as never)
        }
      />
    ),
    [router],
  );

  const renderFooter = useCallback(
    () =>
      isFetchingNextPage ? (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      ) : null,
    [isFetchingNextPage],
  );

  if (isLoading)
    return (
      <View style={styles.stateArea}>
        <LoadingState message="Loading keysets needing attention…" />
      </View>
    );
  if (isError)
    return (
      <View style={styles.stateArea}>
        <ErrorState
          title="Couldn't load keysets"
          message="Check your connection and try again."
          onRetry={refetch}
        />
      </View>
    );

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[
        styles.listContent,
        { paddingBottom },
        items.length === 0 && styles.listEmpty,
      ]}
      refreshControl={
        <RefreshControl
          refreshing={isFetching && !isLoading}
          onRefresh={refetch}
        />
      }
      onEndReached={() => {
        if (hasNextPage) fetchNextPage();
      }}
      onEndReachedThreshold={0.3}
      ListEmptyComponent={
        <EmptyState
          Icon={Building2}
          title="All good"
          message="No keysets need attention right now."
        />
      }
      ListFooterComponent={renderFooter}
      renderItem={renderItem}
      ItemSeparatorComponent={() => <View style={styles.itemSep} />}
      showsVerticalScrollIndicator={false}
    />
  );
}

// ── Agent view ────────────────────────────────────────────────────────────────

function AgentActivityView() {
  const router = useRouter();
  const listPaddingBottom = useBottomListPadding();
  const currentUserId = useCurrentUserId();

  const {
    data: checkedOut = [],
    isLoading: checkedOutLoading,
    refetch: refetchCheckedOut,
  } = useCheckedOutKeySets(50);

  const {
    data: myReservations = [],
    isLoading: reservationsLoading,
    refetch: refetchReservations,
  } = useMyReservations(currentUserId);

  const {
    data: historyData,
    isLoading: historyLoading,
    isError: historyError,
    refetch: refetchHistory,
    isFetching: historyFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteHistory({ myActivityOnly: true });

  const checkedOutSorted = sortByDueDate(checkedOut);
  const checkedOutIds = new Set(checkedOutSorted.map((ks) => ks.id));
  const reservedKeySets = myReservations.filter(
    (res) => res.key_set && !checkedOutIds.has(res.key_set.id),
  );
  const keysetsLoading = checkedOutLoading || reservationsLoading;
  const hasKeysets = checkedOutSorted.length > 0 || reservedKeySets.length > 0;

  const historyItems = useMemo(
    () => (historyData?.pages.flat() ?? []) as ActivityTransaction[],
    [historyData],
  );

  const goToKeyset = useCallback(
    (id: string) => router.push(`/(app)/properties/keyset/${id}` as never),
    [router],
  );

  const ListHeader = (
    <View style={styles.agentHeader}>
      <View style={styles.section}>
        <SectionHeader title="My Keysets" />
        {keysetsLoading ? (
          <Card>
            <Text style={styles.emptyText}>Loading keysets…</Text>
          </Card>
        ) : !hasKeysets ? (
          <Card>
            <Text style={styles.emptyText}>No keysets checked out.</Text>
          </Card>
        ) : (
          <View style={styles.cardList}>
            {checkedOutSorted.map((keySet) => (
              <KeySetPropertyCard
                key={keySet.id}
                item={keySet}
                showHolder={false}
                hideCheckedOutBadge
                onPress={() => goToKeyset(keySet.id)}
              />
            ))}
            {reservedKeySets.map((res) => (
              <KeySetReservedCard
                key={res.id}
                reservation={res}
                onPress={() => res.key_set && goToKeyset(res.key_set.id)}
              />
            ))}
          </View>
        )}
      </View>

      <SectionHeader title="My Activity" />
    </View>
  );

  const renderItem = useCallback(
    ({ item }: { item: ActivityTransaction }) => (
      <Card style={styles.historyCard}>
        <ActivityRow item={item} />
      </Card>
    ),
    [],
  );

  const renderFooter = useCallback(
    () =>
      isFetchingNextPage ? (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      ) : null,
    [isFetchingNextPage],
  );

  const onRefresh = useCallback(() => {
    refetchCheckedOut();
    refetchReservations();
    refetchHistory();
  }, [refetchCheckedOut, refetchReservations, refetchHistory]);

  return (
    <FlatList
      style={styles.screen}
      data={historyItems}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[
        styles.agentListContent,
        { paddingBottom: listPaddingBottom },
      ]}
      ListHeaderComponent={ListHeader}
      refreshControl={
        <RefreshControl
          refreshing={historyFetching && !historyLoading}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
      onEndReached={() => {
        if (hasNextPage) fetchNextPage();
      }}
      onEndReachedThreshold={0.3}
      ListEmptyComponent={
        historyLoading ? (
          <View style={styles.historyLoading}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : historyError ? (
          <View style={styles.stateArea}>
            <ErrorState
              title="Couldn't load activity"
              message="Check your connection and try again."
              onRetry={refetchHistory}
            />
          </View>
        ) : (
          <Text style={styles.emptyActivityText}>No recent activity yet.</Text>
        )
      }
      ListFooterComponent={renderFooter}
      renderItem={renderItem}
      ItemSeparatorComponent={() => <View style={styles.historyItemSep} />}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    />
  );
}


// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  stateArea: {
    flex: 1,
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.md,
  },
  listContent: {
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  listEmpty: { flexGrow: 1, justifyContent: "center" },
  itemSep: { height: theme.spacing.sm },
  footerLoader: { paddingVertical: theme.spacing.lg, alignItems: "center" },
  // Agent
  agentHeader: {
    paddingTop: theme.spacing.md,
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  agentListContent: {
    paddingHorizontal: theme.spacing.screen,
  },
  section: { gap: theme.spacing.sm },
  cardList: { gap: theme.spacing.sm },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    padding: theme.spacing.md,
  },
  historyLoading: { paddingVertical: theme.spacing.lg, alignItems: "center" },
  historyItemSep: { height: 6 },
  historyCard: { padding: 0 },
  emptyActivityText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: "center",
    paddingVertical: theme.spacing.lg,
  },
});


const tabStyles = StyleSheet.create({
  strip: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  btn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  btnActive: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accent,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  labelActive: {
    color: theme.colors.accent,
  },
});


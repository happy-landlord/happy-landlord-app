import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { FileText, KeyRound, X } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ActivityCard } from "@/components/activity";
import {
  AddressSearch,
  EmptyState,
  ErrorState,
  LoadingState,
  Pill,
  type AddressSearchRef,
  type PlaceResult,
} from "@/components/ui";
import { useInfiniteActivity } from "@/lib/hooks";
import { useRole } from "@/hooks";
import { theme, useBottomListPadding } from "@/constants";
import { placeSearchLabel, toDateLabel } from "@/lib/utils";
import type { ActivityTransaction } from "@/types";

// ── Section grouping ─────────────────────────────────────────────────────────

type Section = {
  title: string;
  data: ActivityTransaction[];
};

function groupByDate(transactions: ActivityTransaction[]): Section[] {
  const map = new Map<string, ActivityTransaction[]>();
  for (const t of transactions) {
    const label = toDateLabel(t.created_at);
    const existing = map.get(label);
    if (existing) existing.push(t);
    else map.set(label, [t]);
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function ActivityScreen() {
  const router = useRouter();
  const { isAdmin } = useRole();
  const listPaddingBottom = useBottomListPadding();
  const searchRef = useRef<AddressSearchRef>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const { propertyId, keySetId, keySetName } = useLocalSearchParams<{
    propertyId?: string;
    keySetId?: string;
    keySetName?: string;
  }>();

  const search = placeSearchLabel(selectedPlace);

  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteActivity({ search, propertyId, keySetId });

  const allItems = useMemo(() => data?.pages.flat() ?? [], [data]);
  const sections = useMemo(() => groupByDate(allItems), [allItems]);

  const renderItem = useCallback(
    ({ item }: { item: ActivityTransaction }) => (
      <ActivityCard item={item} showKeySetCode={isAdmin} />
    ),
    [isAdmin],
  );

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }, [isFetchingNextPage]);

  const clearPlace = () => {
    setSelectedPlace(null);
    searchRef.current?.clear();
  };

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <LoadingState message="Loading activity…" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <AddressSearch
            ref={searchRef}
            placeholder="Filter by property address"
            onSelect={setSelectedPlace}
          />
        </View>
        {selectedPlace ? (
          <Pressable
            onPress={clearPlace}
            style={styles.clearButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear filter"
          >
            <X size={16} color={theme.colors.textMuted} strokeWidth={2} />
          </Pressable>
        ) : null}
      </View>

      {keySetId ? (
        <View style={styles.chipRow}>
          <Pressable
            onPress={() =>
              router.setParams({ keySetId: undefined, keySetName: undefined })
            }
            accessibilityRole="button"
            accessibilityLabel="Clear keyset filter"
          >
            <Pill
              tone="primary"
              variant="soft"
              leading={
                <KeyRound size={13} color={theme.colors.primary} strokeWidth={2} />
              }
            >
              {`${keySetName ?? "Keyset"}   ✕`}
            </Pill>
          </Pressable>
        </View>
      ) : null}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        style={styles.sectionList}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: listPaddingBottom },
          sections.length === 0 && styles.listEmpty,
        ]}
        stickySectionHeadersEnabled={false}
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
        ListHeaderComponent={
          isError ? (
            <ErrorState
              title="Couldn't load activity"
              message="Pull down to try again."
            />
          ) : null
        }
        ListEmptyComponent={
          !isError ? (
            <EmptyState
              Icon={FileText}
              title={
                keySetId
                  ? "No activity"
                  : selectedPlace
                    ? "No results"
                    : "No activity yet"
              }
              message={
                keySetId
                  ? `No transactions recorded for ${keySetName ?? "this keyset"}.`
                  : selectedPlace
                    ? `No transactions for "${placeSearchLabel(selectedPlace)}"`
                    : "Keyset transactions you record will appear here."
              }
            />
          ) : null
        }
        ListFooterComponent={renderFooter}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.itemSep} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  searchWrap: { flex: 1 },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.neutralSoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  chipRow: {
    flexDirection: "row",
    marginHorizontal: theme.spacing.screen,
    marginBottom: theme.spacing.sm,
  },
  sectionList: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  list: {
    paddingHorizontal: theme.spacing.screen,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: "center",
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: theme.spacing.lg,
    marginBottom: 6,
  },
  itemSep: { height: 6 },
  footerLoader: {
    paddingVertical: theme.spacing.lg,
    alignItems: "center",
  },
});

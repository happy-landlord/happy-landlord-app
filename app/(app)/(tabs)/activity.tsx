import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  SectionList,
  Text,
  View,
  StyleSheet,
  RefreshControl,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FileText, X } from "lucide-react-native";
import { useLocalSearchParams } from "expo-router";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  AddressSearch,
  type AddressSearchRef,
  type PlaceResult,
} from "@/components/ui/AddressSearch";
import { useCurrentUserId } from "@/hooks/useSession";
import { useRole } from "@/hooks/useRole";
import { useInfiniteActivity } from "@/hooks/useTransactions";
import { theme } from "@/constants/theme";
import { MOVEMENT_CONFIG, getMovementLabel } from "@/constants/movements";
import { formatShortAddress, toDateLabel, formatTime } from "@/lib/format";
import type { ActivityTransaction } from "@/types/database";

// --- Section grouping ---
type Section = {
  title: string;
  data: ActivityTransaction[];
};
function groupByDate(transactions: ActivityTransaction[]): Section[] {
  const map: Map<string, ActivityTransaction[]> = new Map();
  for (const t of transactions) {
    const label = toDateLabel(t.created_at);
    const existing = map.get(label);
    if (existing) {
      existing.push(t);
    } else {
      map.set(label, [t]);
    }
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

// --- Activity item ---
function ActivityItem({ item }: { item: ActivityTransaction }) {
  const currentUserId = useCurrentUserId();
  const { Icon, color, bg } = MOVEMENT_CONFIG[item.transaction_type];
  const propertyLine = formatShortAddress(item.property);
  const label = getMovementLabel(item, currentUserId);
  const keysLine =
    item.items.length > 0
      ? item.items
          .map((i) => i.key?.label ?? i.key?.key_code ?? "Key")
          .join(" · ")
      : null;
  return (
    <View style={styles.item}>
      <View style={[styles.iconBadge, { backgroundColor: bg }]}>
        <Icon size={18} color={color} strokeWidth={2} />
      </View>
      <View style={styles.itemContent}>
        <View style={styles.itemTop}>
          <Text style={[styles.itemLabel, { color }]} numberOfLines={2}>
            {label}
          </Text>
          <Text style={styles.itemTime}>{formatTime(item.created_at)}</Text>
        </View>
        <Text style={styles.itemAddress} numberOfLines={1}>
          {propertyLine}
        </Text>
        {keysLine ? (
          <Text style={styles.itemKeys} numberOfLines={2}>
            {keysLine}
          </Text>
        ) : null}
        {item.notes ? (
          <Text style={styles.itemNotes} numberOfLines={2}>
            {item.notes}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// --- Screen ---
export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const { isAdmin } = useRole();
  const searchRef = useRef<AddressSearchRef>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const { propertyId } = useLocalSearchParams<{ propertyId?: string }>();

  const search =
    selectedPlace?.suburb ??
    (selectedPlace ? selectedPlace.description.split(",")[0].trim() : "") ??
    "";

  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteActivity({ search, propertyId });

  const allItems = useMemo(
    () => data?.pages.flat() ?? [],
    [data],
  );

  const sections = useMemo(() => groupByDate(allItems), [allItems]);

  const renderItem = useCallback(
    ({ item }: { item: ActivityTransaction }) => (
      <ActivityItem item={item} />
    ),
    [],
  );

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }, [isFetchingNextPage]);

  if (isLoading) {
    return (
      <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
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
            onPress={() => {
              setSelectedPlace(null);
              searchRef.current?.clear();
            }}
            style={styles.clearButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear filter"
          >
            <X size={16} color={theme.colors.textMuted} strokeWidth={2} />
          </Pressable>
        ) : null}
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        style={styles.sectionList}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 96 },
          sections.length === 0 && styles.listEmpty,
        ]}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
          />
        }
        onEndReached={() => { if (hasNextPage) fetchNextPage(); }}
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
              title={selectedPlace ? "No results" : "No activity yet"}
              message={
                selectedPlace
                  ? `No transactions for "${selectedPlace.suburb ?? selectedPlace.description.split(",")[0].trim()}"`
                  : isAdmin
                    ? "No key transactions have been recorded yet."
                    : "Key transactions you record will appear here."
              }
            />
          ) : null
        }
        ListFooterComponent={renderFooter}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        renderItem={renderItem}
        SectionSeparatorComponent={() => <View style={styles.sectionSep} />}
        ItemSeparatorComponent={() => <View style={styles.itemSep} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// --- Styles ---
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
  searchWrap: {
    flex: 1,
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.neutralSoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
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
  sectionSep: {
    height: 0,
  },
  itemSep: {
    height: 6,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  itemContent: {
    flex: 1,
    gap: 2,
  },
  itemTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  itemTime: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  itemAddress: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: "500",
  },
  itemKeys: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: "500",
  },
  itemNotes: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginTop: 4,
    fontStyle: "italic",
  },
  footerLoader: {
    paddingVertical: theme.spacing.lg,
    alignItems: "center",
  },
});

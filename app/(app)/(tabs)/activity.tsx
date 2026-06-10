import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { FileText, Search, SlidersHorizontal, X } from "lucide-react-native";

import {
  ActivityCard,
  ActivityFilterChips,
  ActivityFilterSheet,
  useActivityFilters,
} from "@/components/activity";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui";
import { useInfiniteActivity } from "@/lib/hooks";
import { useRole, useDebouncedValue } from "@/hooks";
import { theme, useBottomListPadding } from "@/constants";
import { toDateLabel, toIsoDate } from "@/lib/utils";
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
  const { isAdmin } = useRole();
  const listPaddingBottom = useBottomListPadding();
  const searchInputRef = useRef<TextInput>(null);

  // Search state
  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebouncedValue(searchText, 400);

  // Filters + URL-param context (myActivityOnly deep-link, keyset context)
  const {
    filters,
    patch: patchFilters,
    reset: resetFilters,
    activeCount: activeFilterCount,
    propertyId,
    keySetId,
    keySetName,
    clearKeysetParam,
  } = useActivityFilters();

  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteActivity({
    search: debouncedSearch,
    propertyId,
    keySetId,
    myActivityOnly: filters.myActivityOnly,
    dateFrom: toIsoDate(filters.dateFrom),
    dateTo: toIsoDate(filters.dateTo),
  });

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

  const clearSearch = () => {
    setSearchText("");
    searchInputRef.current?.clear();
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      {/* ── Search row ────────────────────────────────────────────────────── */}
      <View style={styles.searchRow}>
        {/* Search input */}
        <View style={styles.searchInputWrap}>
          <Search
            size={16}
            color={theme.colors.textLight}
            strokeWidth={2}
            style={styles.searchIcon}
          />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Address or keyset code…"
            placeholderTextColor={theme.colors.textLight}
            selectionColor={theme.colors.primary}
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="never"
          />
          {searchText.length > 0 && (
            <Pressable onPress={clearSearch} hitSlop={8}>
              <X size={15} color={theme.colors.textMuted} strokeWidth={2} />
            </Pressable>
          )}
        </View>

        {/* Filter button */}
        <Pressable
          onPress={() => setFilterSheetOpen(true)}
          style={({ pressed }) => [
            styles.filterBtn,
            activeFilterCount > 0 && styles.filterBtnActive,
            pressed && styles.filterBtnPressed,
          ]}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel="Open filters"
        >
          <SlidersHorizontal
            size={18}
            color={
              activeFilterCount > 0
                ? theme.colors.primary
                : theme.colors.textMuted
            }
            strokeWidth={2}
          />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* ── Active filter chips ───────────────────────────────────────────── */}
      <ActivityFilterChips
        filters={filters}
        keySetId={keySetId}
        keySetName={keySetName}
        onClearKeyset={clearKeysetParam}
        onPatch={patchFilters}
      />

      {/* ── List / states ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <View style={[styles.stateArea, { paddingBottom: listPaddingBottom }]}>
          <LoadingState message="Loading activity…" />
        </View>
      ) : isError ? (
        <View style={[styles.stateArea, { paddingBottom: listPaddingBottom }]}>
          <ErrorState
            title="Couldn't load activity"
            message="Check your connection and try again."
            onRetry={refetch}
          />
        </View>
      ) : (
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
          ListEmptyComponent={
            <EmptyState
              Icon={FileText}
              title={
                keySetId
                  ? "No activity"
                  : searchText || activeFilterCount > 0
                    ? "No results"
                    : "No activity yet"
              }
              message={
                keySetId
                  ? `No transactions recorded for ${keySetName ?? "this keyset"}.`
                  : searchText || activeFilterCount > 0
                    ? "Try adjusting your search or filters."
                    : "Keyset transactions you record will appear here."
              }
            />
          }
          ListFooterComponent={renderFooter}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionHeader}>{title}</Text>
          )}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.itemSep} />}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      )}

      {/* ── Filter bottom sheet ────────────────────────────────────────────── */}
      <ActivityFilterSheet
        visible={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        filters={filters}
        onChange={patchFilters}
        onReset={resetFilters}
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

  // ── Search row ─────────────────────────────────────────────────────────────
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  searchIcon: {
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
    paddingVertical: 0,
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  filterBtnActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  filterBtnPressed: { opacity: 0.7 },
  filterBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.primaryText,
    lineHeight: 12,
  },

  // ── List ───────────────────────────────────────────────────────────────────
  sectionList: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  stateArea: {
    flex: 1,
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.md,
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

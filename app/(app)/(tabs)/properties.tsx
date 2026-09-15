import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { PropertyCard } from "@/components/property";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui";

import {
  PropertiesFilterBar,
  type AdminPropertyTab,
} from "@/components/property";
import { useInfiniteProperties } from "@/lib/hooks";
import { useDebouncedValue, useRole, useRefreshControl } from "@/hooks";
import type { DbProperty, PropertyStatus } from "@/types";
import { theme, useBottomListPadding } from "@/constants";

const EMPTY_MESSAGE_BY_TAB: Record<AdminPropertyTab, string> = {
  active: "No active properties.",
  leased: "No properties are currently leased.",
  inactive: "No inactive properties.",
};

export default function PropertiesScreen() {
  const listPaddingBottom = useBottomListPadding();
  const { isAdmin } = useRole();
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: AdminPropertyTab }>();

  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebouncedValue(searchText, 400);
  const adminTab: AdminPropertyTab =
    tab && ["active", "leased", "inactive"].includes(tab) ? tab : "active";

  const setAdminTab = useCallback(
    (nextTab: AdminPropertyTab) => router.setParams({ tab: nextTab }),
    [router],
  );

  const status: PropertyStatus = isAdmin ? adminTab : "active";

  const {
    properties,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteProperties({ search: debouncedSearch, status });

  const { refreshing, onRefresh } = useRefreshControl(refetch);

  const renderItem = useCallback(
    ({ item }: { item: DbProperty }) => <PropertyCard property={item} />,
    [],
  );

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <EmptyState
        title={debouncedSearch ? "No results" : "No properties"}
        message={
          debouncedSearch
            ? `No properties found for "${debouncedSearch.trim()}"`
            : EMPTY_MESSAGE_BY_TAB[adminTab]
        }
      />
    );
  }, [isLoading, debouncedSearch, adminTab]);

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.accentLight} />
      </View>
    );
  }, [isFetchingNextPage]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <View style={styles.screen}>
      {/* Page title */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Properties</Text>
      </View>

      <PropertiesFilterBar
        search={searchText}
        onSearchChange={setSearchText}
        adminTab={adminTab}
        onAdminTabChange={setAdminTab}
      />

      {isError ? (
        <View style={[styles.stateArea, { paddingBottom: listPaddingBottom }]}>
          <ErrorState
            title="Couldn't load properties"
            message="Check your connection and try again."
            onRetry={refetch}
          />
        </View>
      ) : isLoading ? (
        <View style={[styles.stateArea, { paddingBottom: listPaddingBottom }]}>
          <LoadingState message="Loading properties…" />
        </View>
      ) : (
        <FlatList
          data={properties}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: listPaddingBottom },
            properties.length === 0 && styles.listEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.accentLight}
              colors={[theme.colors.accentLight]}
            />
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  pageHeader: {
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: theme.colors.text,
    letterSpacing: -0.3,
  },
  list: {
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  stateArea: {
    flex: 1,
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.md,
  },
  listEmpty: {
    flexGrow: 1,
  },
  footerLoader: {
    paddingVertical: theme.spacing.lg,
    alignItems: "center",
  },
});

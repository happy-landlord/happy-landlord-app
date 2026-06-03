import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from "react-native";

import { PropertyCard } from "@/components/PropertyCard";
import { EmptyState , ErrorState , LoadingState } from "@/components/ui";


import { type PlaceResult } from "@/components/ui";
import {
  PropertiesFilterBar,
  type AdminPropertyTab,
} from "@/components/property";
import { useInfiniteProperties } from "@/lib/hooks";
import { useRole, useRefreshControl } from "@/hooks";
import { placeSearchLabel } from "@/lib/utils";
import type { DbProperty, PropertyStatus } from "@/types";
import { theme , useBottomListPadding } from "@/constants";


const EMPTY_MESSAGE_BY_TAB: Record<AdminPropertyTab, string> = {
  active: "No active properties.",
  leased: "No properties are currently leased.",
  inactive: "No inactive properties.",
};

export default function PropertiesScreen() {
  const listPaddingBottom = useBottomListPadding();
  const { isAdmin } = useRole();

  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [adminTab, setAdminTab] = useState<AdminPropertyTab>("active");

  const search = placeSearchLabel(selectedPlace);
  const status: PropertyStatus = isAdmin ? adminTab : "active";

  const {
    properties,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteProperties({ search, status });

  const { refreshing, onRefresh } = useRefreshControl(refetch);

  const renderItem = useCallback(
    ({ item }: { item: DbProperty }) => <PropertyCard property={item} />,
    [],
  );

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <EmptyState
        title={selectedPlace ? "No results" : "No properties"}
        message={
          selectedPlace
            ? `No properties found in "${placeSearchLabel(selectedPlace)}"`
            : EMPTY_MESSAGE_BY_TAB[adminTab]
        }
      />
    );
  }, [isLoading, selectedPlace, adminTab]);

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }, [isFetchingNextPage]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <View style={styles.screen}>
      <PropertiesFilterBar
        selectedPlace={selectedPlace}
        onPlaceChange={setSelectedPlace}
        adminTab={adminTab}
        onAdminTabChange={setAdminTab}
      />

      {isError ? (
        <View
          style={[
            styles.stateArea,
            { paddingBottom: listPaddingBottom },
          ]}
        >
          <ErrorState
            title="Couldn't load properties"
            message="Check your connection and try again."
            onRetry={refetch}
          />
        </View>
      ) : isLoading ? (
        <View
          style={[
            styles.stateArea,
            { paddingBottom: listPaddingBottom },
          ]}
        >
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
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
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
  list: {
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.screen,
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

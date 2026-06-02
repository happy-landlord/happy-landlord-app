import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PropertyCard } from "@/components/PropertyCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { type PlaceResult } from "@/components/ui/AddressSearch";
import {
  PropertiesFilterBar,
  type AdminPropertyTab,
} from "@/components/property/PropertiesFilterBar";
import { useInfiniteProperties } from "@/lib/hooks/useProperties";
import { useRole } from "@/hooks/useRole";
import { placeSearchLabel } from "@/lib/utils/places";
import type { DbProperty, PropertyKeyStatus } from "@/types/database";
import { theme } from "@/constants/theme";

const AGENT_KEY_STATUS: PropertyKeyStatus = "available";

const EMPTY_MESSAGE_BY_TAB: Record<AdminPropertyTab, string> = {
  available: "No keysets are currently in the office.",
  leased: "No properties are currently leased.",
  landlord: "No keysets have been returned to landlords.",
};

export default function PropertiesScreen() {
  const insets = useSafeAreaInsets();
  const { isAdmin } = useRole();

  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [adminTab, setAdminTab] = useState<AdminPropertyTab>("available");

  const search = placeSearchLabel(selectedPlace);
  const keyStatus: PropertyKeyStatus = isAdmin ? adminTab : AGENT_KEY_STATUS;

  const {
    properties,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteProperties({ search, keyStatus });

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
        <ErrorState
          title="Couldn't load keysets"
          message="Check your connection and try again."
          onRetry={refetch}
        />
      ) : isLoading ? (
        <LoadingState message="Loading keysets…" />
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
            { paddingBottom: insets.bottom + 96 },
            properties.length === 0 && styles.listEmpty,
          ]}
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
  listEmpty: {
    flexGrow: 1,
  },
  footerLoader: {
    paddingVertical: theme.spacing.lg,
    alignItems: "center",
  },
});

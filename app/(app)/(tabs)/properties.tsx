import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Plus, X } from "lucide-react-native";

import { PropertyCard } from "@/components/PropertyCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  AddressSearch,
  type AddressSearchRef,
  type PlaceResult,
} from "@/components/ui/AddressSearch";
import { useInfiniteProperties } from "@/hooks/useProperties";
import { useRole } from "@/hooks/useRole";
import { RoleGate } from "@/components/RoleGate";
import type {
  Property,
  PropertyKeyStatus,
} from "@/services/properties.service";
import { theme } from "@/constants/theme";

type AdminTab = "available" | "leased" | "landlord";

const TABS: { id: AdminTab; label: string }[] = [
  { id: "available", label: "Active" },
  { id: "leased", label: "Leased" },
  { id: "landlord", label: "Inactive" },
];

export default function KeysScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [adminTab, setAdminTab] = useState<AdminTab>("available");
  const searchRef = useRef<AddressSearchRef>(null);

  const { isAdmin } = useRole();
  const keyStatus: PropertyKeyStatus = isAdmin ? adminTab : "available";

  const search =
    selectedPlace?.suburb ??
    selectedPlace?.description.split(",")[0].trim() ??
    "";

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteProperties({ search, keyStatus });

  const properties = useMemo(
    () => data?.pages.flat() ?? [],
    [data],
  );

  const renderItem = useCallback(
    ({ item }: { item: Property }) => <PropertyCard property={item} />,
    [],
  );

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <EmptyState
        title={selectedPlace ? "No results" : "No properties"}
        message={
          selectedPlace
            ? `No properties found in "${selectedPlace.suburb ?? selectedPlace.description.split(",")[0].trim()}"`
            : adminTab === "leased"
              ? "No properties are currently leased."
              : adminTab === "landlord"
                ? "No keys have been returned to landlords."
                : "No keys are currently in the office."
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

  return (
    <View style={styles.screen}>
      {/* Address search */}
      <View style={styles.searchActionRow}>
        <View style={styles.searchBarWrap}>
          <AddressSearch
            ref={searchRef}
            placeholder="Search by address or suburb…"
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

        <Pressable
          style={({ pressed }) => [
            styles.addPropertyButton,
            pressed && styles.addPropertyButtonPressed,
          ]}
          onPress={() => router.push("/(app)/properties/add")}
          accessibilityRole="button"
          accessibilityLabel="Add property"
        >
          <Plus size={20} color={theme.colors.textInverse} strokeWidth={2.4} />
        </Pressable>
      </View>

      {/* Admin-only tab strip */}
      <RoleGate allow="admin">
        <View style={styles.tabStrip}>
          {TABS.map((tab) => {
            const active = adminTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                style={[styles.tabBtn, active && styles.tabBtnActive]}
                onPress={() => setAdminTab(tab.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[styles.tabLabel, active && styles.tabLabelActive]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </RoleGate>

      {/* Content */}
      {isError ? (
        <ErrorState
          title="Couldn't load keys"
          message="Check your connection and try again."
          onRetry={refetch}
        />
      ) : isLoading ? (
        <LoadingState message="Loading keys…" />
      ) : (
        <FlatList
          data={properties}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={() => { if (hasNextPage) fetchNextPage(); }}
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

  searchActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  searchBarWrap: {
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
  addPropertyButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    flexShrink: 0,
  },
  addPropertyButtonPressed: {
    opacity: 0.75,
  },

  // ── Admin tabs ────────────────────────────────────────────────────────────
  tabStrip: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.screen,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabBtnActive: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primary,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  tabLabelActive: {
    color: theme.colors.primary,
  },

  // ── List ──────────────────────────────────────────────────────────────────
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

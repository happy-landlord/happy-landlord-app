import { useCallback, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PropertyCard } from "@/components/PropertyCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  AddressSearchBar,
  type AddressSearchBarRef,
} from "@/components/ui/AddressSearchBar";
import type { PlaceResult } from "@/components/ui/AddressSearch";
import { useProperties } from "@/hooks/useProperties";
import { useRole } from "@/hooks/useRole";
import { RoleGate } from "@/components/RoleGate";
import type { Property, PropertyKeyStatus } from "@/services/properties.service";
import { theme } from "@/constants/theme";

type AdminTab = "available" | "landlord";

const TABS: { id: AdminTab; label: string }[] = [
  { id: "available", label: "Active" },
  { id: "landlord", label: "Inactive" },
];

export default function KeysScreen() {
  const insets = useSafeAreaInsets();
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [adminTab, setAdminTab] = useState<AdminTab>("available");
  const searchRef = useRef<AddressSearchBarRef>(null);

  const { isAdmin } = useRole();
  const keyStatus: PropertyKeyStatus = isAdmin ? adminTab : "available";

  // Derive a plain search string from the selected place for the server query
  const search = selectedPlace?.suburb ?? selectedPlace?.description.split(",")[0].trim() ?? "";

  const { data, isLoading, isError, refetch } = useProperties({ search, keyStatus });

  const renderItem = useCallback(
    ({ item }: { item: Property }) => <PropertyCard property={item} />,
    []
  );

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <EmptyState
        title={selectedPlace ? "No results" : "No properties"}
        message={
          selectedPlace
            ? `No properties found in "${selectedPlace.suburb ?? selectedPlace.description.split(",")[0].trim()}"`
            : adminTab === "landlord"
              ? "No keys have been returned to landlords."
              : "No keys are currently in the office."
        }
      />
    );
  }, [isLoading, selectedPlace, adminTab]);

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
      {/* Address search */}
      <AddressSearchBar
        ref={searchRef}
        placeholder="Search by address or suburb…"
        selectedPlace={selectedPlace}
        resultCount={0}
        showResultCount={false}
        showDivider={false}
        onSelect={setSelectedPlace}
        onClear={() => { setSelectedPlace(null); searchRef.current?.clear(); }}
      />

      {/* Admin-only tab strip — RoleGate handles the loading state so no flash */}
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
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
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
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.list,
            (!data || data.length === 0) && styles.listEmpty,
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
    padding: theme.spacing.screen,
    gap: theme.spacing.xs,
  },
  listEmpty: {
    flexGrow: 1,
  },
});

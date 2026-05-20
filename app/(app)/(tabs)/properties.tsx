import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Search } from "lucide-react-native";
import { useDebounce } from "use-debounce";

import { PropertyCard } from "@/components/PropertyCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
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
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch] = useDebounce(searchText, 350);
  const [adminTab, setAdminTab] = useState<AdminTab>("available");

  const { isAdmin } = useRole();

  // Agents always see only available keys; admins filter by selected tab.
  // While the role is still loading we default to "available" so the query
  // can pre-fetch; the tab strip won't render until roleLoading is false.
  const keyStatus: PropertyKeyStatus = isAdmin ? adminTab : "available";

  const { data, isLoading, isError, refetch } = useProperties({
    search: debouncedSearch,
    keyStatus,
  });

  const renderItem = useCallback(
    ({ item }: { item: Property }) => <PropertyCard property={item} />,
    []
  );

  const renderSeparator = useCallback(
    () => <View style={styles.separator} />,
    []
  );

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <EmptyState
        title={searchText ? "No results" : "No properties"}
        message={
          searchText
            ? `No properties match "${searchText}"`
            : adminTab === "landlord"
              ? "No keys have been returned to landlords."
              : "No keys are currently in the office."
        }
      />
    );
  }, [isLoading, searchText, adminTab]);

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={18} color={theme.colors.textMuted} strokeWidth={1.8} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by address, suburb or postcode…"
            placeholderTextColor={theme.colors.textLight}
            value={searchText}
            onChangeText={setSearchText}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        {!isLoading && data && (
          <Text style={styles.resultCount}>
            {data.length} {data.length === 1 ? "property" : "properties"}
          </Text>
        )}
      </View>

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
          ItemSeparatorComponent={renderSeparator}
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

  // ── Search ────────────────────────────────────────────────────────────────
  searchContainer: {
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
    paddingVertical: 0,
  },
  resultCount: {
    fontSize: 12,
    color: theme.colors.textLight,
    paddingLeft: 2,
  },

  // ── Admin tabs ────────────────────────────────────────────────────────────
  tabStrip: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.screen,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
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
  separator: {
    height: theme.spacing.sm,
  },
});

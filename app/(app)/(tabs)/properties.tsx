import { useCallback, useState } from "react";
import {
  FlatList,
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
import type { Property } from "@/services/properties.service";
import { theme } from "@/constants/theme";

export default function PropertiesScreen() {
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch] = useDebounce(searchText, 350);

  const { data, isLoading, isError, refetch } = useProperties(debouncedSearch);

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
        title={searchText ? "No results" : "No properties yet"}
        message={
          searchText
            ? `No properties match "${searchText}"`
            : "Properties you add will appear here."
        }
      />
    );
  }, [isLoading, searchText]);

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

      {/* Content */}
      {isError ? (
        <ErrorState
          title="Couldn't load properties"
          message="Check your connection and try again."
          onRetry={refetch}
        />
      ) : isLoading ? (
        <LoadingState message="Loading properties…" />
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

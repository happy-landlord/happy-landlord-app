import { useCallback, useDeferredValue, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Search, UserCheck } from "lucide-react-native";

import { theme } from "@/constants";
import { useAgents } from "@/lib/hooks";
import { useRefreshControl } from "@/hooks";
import type { AgentProfile } from "@/lib/services";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui";

import { AgentCard } from "./AgentCard";
import { AgentDetailsSheet } from "./AgentDetailsSheet";
import { sharedStyles } from "./styles";

/** Agents list — search + cards. */
export function AgentsList() {
  const { data: agents, isLoading, error, refetch } = useAgents();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AgentProfile | null>(null);
  const deferredSearch = useDeferredValue(search);
  const { refreshing, onRefresh } = useRefreshControl(refetch);

  const filteredAgents = useMemo(() => {
    const trimmed = deferredSearch.trim().toLowerCase();
    if (!trimmed) return agents ?? [];
    return (agents ?? []).filter((agent) =>
      displayNameOf(agent).toLowerCase().includes(trimmed),
    );
  }, [agents, deferredSearch]);

  const handlePress = useCallback(
    (agent: AgentProfile) => setSelected(agent),
    [],
  );
  const handleClose = useCallback(() => setSelected(null), []);

  const renderAgent = useCallback(
    ({ item }: { item: AgentProfile }) => (
      <AgentCard agent={item} onPress={() => handlePress(item)} />
    ),
    [handlePress],
  );

  if (isLoading) {
    return <LoadingState message="Loading agents…" />;
  }

  if (error) {
    return (
      <ErrorState
        title="Couldn't load agents"
        message="Check your connection and try again."
        onRetry={refetch}
      />
    );
  }

  if (!agents || agents.length === 0) {
    return (
      <EmptyState
        Icon={UserCheck}
        title="No agents yet"
        message="Approved agents will appear here once they complete registration."
      />
    );
  }

  return (
    <>
      <FlatList
        data={filteredAgents}
        keyExtractor={keyExtractor}
        contentContainerStyle={sharedStyles.list}
        ListHeaderComponent={
          <View style={styles.searchBox}>
            <Search size={18} color={theme.colors.textLight} strokeWidth={2} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search agent name"
              placeholderTextColor={theme.colors.textLight}
              autoCapitalize="words"
              autoCorrect={false}
              style={styles.searchInput}
            />
          </View>
        }
        ListHeaderComponentStyle={styles.searchHeader}
        ListEmptyComponent={
          <View style={styles.searchEmpty}>
            <Text style={sharedStyles.emptyTitle}>No matching agents</Text>
            <Text style={sharedStyles.emptyMessage}>
              Try searching with a different agent name.
            </Text>
          </View>
        }
        ItemSeparatorComponent={Separator}
        renderItem={renderAgent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        keyboardShouldPersistTaps="handled"
      />
      {selected ? (
        <AgentDetailsSheet agent={selected} onClose={handleClose} />
      ) : null}
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const keyExtractor = (item: AgentProfile) => item.id;
const Separator = () => <View style={sharedStyles.separator} />;

function displayNameOf(agent: AgentProfile): string {
  return agent.full_name?.trim() || agent.key_holder_full_name?.trim() || "";
}

const styles = StyleSheet.create({
  searchHeader: { marginBottom: theme.spacing.sm },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 15,
    padding: 0,
  },
  searchEmpty: {
    alignItems: "center",
    paddingTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
  },
});

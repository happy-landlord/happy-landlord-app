import { memo, useCallback, useDeferredValue, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Search, UserCheck } from "lucide-react-native";

import { theme } from "@/constants";
import { useAgents, useProfileImageUrl } from "@/lib/hooks";
import { useRefreshControl } from "@/hooks";
import type { AgentProfile } from "@/lib/services";
import { PhoneLink } from "@/components/ui";

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
      <AgentCard agent={item} onPress={handlePress} />
    ),
    [handlePress],
  );

  if (isLoading) {
    return (
      <View style={sharedStyles.centered}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={sharedStyles.centered}>
        <Text style={sharedStyles.errorText}>Failed to load agents.</Text>
        <Pressable onPress={() => refetch()} style={sharedStyles.retryBtn}>
          <Text style={sharedStyles.retryLabel}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!agents || agents.length === 0) {
    return (
      <View style={sharedStyles.centered}>
        <View style={sharedStyles.emptyIcon}>
          <UserCheck
            size={32}
            color={theme.colors.textLight}
            strokeWidth={1.5}
          />
        </View>
        <Text style={sharedStyles.emptyTitle}>No agents yet</Text>
        <Text style={sharedStyles.emptyMessage}>
          Approved agents will appear here once they complete registration.
        </Text>
      </View>
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
      <AgentDetailsSheet agent={selected} onClose={handleClose} />
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const keyExtractor = (item: AgentProfile) => item.id;
const Separator = () => <View style={sharedStyles.separator} />;

function displayNameOf(agent: AgentProfile): string {
  return agent.full_name?.trim() || agent.key_holder_full_name?.trim() || "";
}

// ── Card ──────────────────────────────────────────────────────────────────────

const AgentCard = memo(function AgentCard({
  agent,
  onPress,
}: {
  agent: AgentProfile;
  onPress: (agent: AgentProfile) => void;
}) {
  const { data: imageUrl } = useProfileImageUrl(agent.profile_image);
  const name = displayNameOf(agent) || null;
  const mobile = agent.phone?.trim() || agent.key_holder_phone?.trim() || null;
  const initial = (name || agent.email || "?")[0].toUpperCase();

  return (
    <Pressable
      onPress={() => onPress(agent)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`View ${name ?? "agent"} details`}
    >
      <View style={styles.imagePane}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={160}
          />
        ) : (
          <View style={styles.imageFallback}>
            <View style={styles.initialCircle}>
              <Text style={styles.imageInitial}>{initial}</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.details}>
          <Text style={styles.name} numberOfLines={1}>
            {name ?? "Unknown name"}
          </Text>
          <Text style={styles.email} numberOfLines={1}>
            {agent.email ?? "—"}
          </Text>
        </View>
        <View style={styles.mobileRow}>
          {mobile ? (
            <PhoneLink
              phone={mobile}
              showIcon
              iconSize={14}
              iconColor={theme.colors.primary}
              textStyle={styles.mobile}
            />
          ) : (
            <Text style={styles.mobileEmpty}>No mobile added</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  searchHeader: { marginBottom: theme.spacing.sm },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    minHeight: 40,
    paddingHorizontal: theme.spacing.sm + 2,
    backgroundColor: theme.colors.surfaceWarm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
    paddingVertical: theme.spacing.xs,
  },
  searchEmpty: {
    alignItems: "center",
    paddingTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
  },
  card: {
    minHeight: 72,
    flexDirection: "row",
    backgroundColor: theme.colors.surfaceWarm,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: { opacity: 0.85 },
  imagePane: { width: 74 },
  image: { width: "100%", height: "100%" },
  imageFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceWarm,
    padding: theme.spacing.sm,
  },
  initialCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  imageInitial: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.accent,
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.sm + 2,
    paddingVertical: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  details: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: 15, fontWeight: "700", color: theme.colors.text },
  email: { fontSize: 12, color: theme.colors.textMuted },
  mobileRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    maxWidth: "44%",
  },
  mobile: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  mobileEmpty: {
    fontSize: 13,
    fontWeight: "400",
    color: theme.colors.textLight,
  },
});

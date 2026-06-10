import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { useRouter } from "expo-router";

import { ActivityRow } from "@/components/history";
import { theme } from "@/constants";
import { useInfiniteHistory } from "@/lib/hooks";

// ── KeySetLastActivity ───────────────────────────────────────────────────────
// Admin-only "Last Activity" preview shown on the keyset detail screen when
// the keyset is available. Owns its data query so the parent screen doesn't
// have to drill activity items down.

const PREVIEW_COUNT = 5;

export type KeySetLastActivityProps = {
  keySetId: string;
  keySetName: string;
  /** When false, the underlying query is suppressed (e.g. for agents). */
  enabled?: boolean;
};

export function KeySetLastActivity({
  keySetId,
  keySetName,
  enabled = true,
}: KeySetLastActivityProps) {
  const router = useRouter();
  const { data } = useInfiniteHistory({ keySetId, enabled });
  const items = data?.pages[0]?.slice(0, PREVIEW_COUNT) ?? [];

  if (!enabled) return null;

  const handleViewAll = () =>
    router.push({
      pathname: "/(app)/(tabs)/history",
      params: { keySetId, keySetName },
    } as never);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Last Activity</Text>
        {items.length > 0 && (
          <Pressable
            onPress={handleViewAll}
            style={({ pressed }) => [
              styles.viewAllBtn,
              pressed && { opacity: 0.6 },
            ]}
            accessibilityRole="button"
          >
            <Text style={styles.viewAllText}>View all</Text>
            <ChevronRight
              size={13}
              color={theme.colors.primary}
              strokeWidth={2.5}
            />
          </Pressable>
        )}
      </View>
      <View style={styles.card}>
        {items.length === 0 ? (
          <Text style={styles.empty}>No transactions recorded yet.</Text>
        ) : (
          items.map((item, index) => (
            <ActivityRow
              key={item.id}
              item={item}
              showAddress={false}
              divider={index < items.length - 1}
            />
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: theme.spacing.sm },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingLeft: theme.spacing.sm,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  empty: {
    padding: theme.spacing.md,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
});

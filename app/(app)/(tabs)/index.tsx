import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { KeyRound } from "lucide-react-native";
import { useRouter } from "expo-router";

import { KeyDashboardSummary } from "@/components/KeyDashboardSummary";
import { KeySetAttentionList } from "@/components/KeySetAttentionList";
import { ActivityRow } from "@/components/activity";
import {
  Card,
  IconBadge,
  MetaRow,
  Pill,
  PressableCard,
  SectionHeader,
  type IconBadgeTone,
} from "@/components/ui";
import {
  useCheckedOutKeySets,
  useKeySetsNeedingAttention,
  useMyActivity,
} from "@/lib/hooks";
import { useRole, useRefreshControl } from "@/hooks";
import { theme, useBottomListPadding } from "@/constants";
import { formatShortDate, isPastDue } from "@/lib/utils";
import type { CheckedOutKeySet } from "@/lib/services";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Earliest due date first; null due dates sink to the bottom. */
function sortByDueDate(keys: CheckedOutKeySet[]): CheckedOutKeySet[] {
  return [...keys].sort((a, b) => {
    if (!a.due_back_at && !b.due_back_at) return 0;
    if (!a.due_back_at) return 1;
    if (!b.due_back_at) return -1;
    return a.due_back_at.localeCompare(b.due_back_at);
  });
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const listPaddingBottom = useBottomListPadding();
  const router = useRouter();
  const { isAdmin } = useRole();

  // useCheckedOutKeySets is now role-scoped server-side — admins see all,
  // agents only their own holdings. The previous client-side filter is gone.
  const { data: checkedOut = [], isLoading: checkedOutLoading, refetch: refetchCheckedOut } =
    useCheckedOutKeySets(isAdmin ? 20 : 50);

  // Recent activity is only rendered for agents — skip the network call for
  // admins (rather than fetching and discarding).
  const { data: activity = [], isLoading: activityLoading, refetch: refetchActivity } = useMyActivity({
    enabled: !isAdmin,
  });

  const { data: needsAttention = [], isLoading: attentionLoading, refetch: refetchAttention } =
    useKeySetsNeedingAttention();

  const { refreshing, onRefresh } = useRefreshControl(
    refetchCheckedOut,
    refetchActivity,
    refetchAttention,
  );

  const checkedOutKeySets = sortByDueDate(checkedOut);
  const recentActivity = activity.slice(0, 4);

  const goToKeyset = (id: string) =>
    router.push(`/(app)/properties/keyset/${id}` as never);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: listPaddingBottom },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
    >
      {/* Key status summary — admin only */}
      {isAdmin && (
        <View style={styles.section}>
          <SectionHeader title="Keyset status" />
          <KeyDashboardSummary />
        </View>
      )}

      {/* Keysets needing attention — admin only, hidden when empty */}
      {isAdmin && (attentionLoading || needsAttention.length > 0) && (
        <View style={styles.section}>
          <SectionHeader title="Needs Attention" />
          <KeySetAttentionList
            data={needsAttention}
            isLoading={attentionLoading}
          />
        </View>
      )}

      {/* Currently checked out */}
      {(checkedOutLoading || checkedOutKeySets.length > 0) && (
        <View style={styles.section}>
          <SectionHeader title="Keysets Checked Out" />
          {checkedOutLoading ? (
            <Card>
              <Text style={styles.emptyText}>Loading checked out keysets…</Text>
            </Card>
          ) : (
            <View style={styles.cardList}>
              {checkedOutKeySets.map((keySet) => (
                <CheckedOutCard
                  key={keySet.id}
                  keySet={keySet}
                  isAdmin={isAdmin}
                  onPress={() => goToKeyset(keySet.id)}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* My activity — agents only */}
      {!isAdmin && (
        <View style={styles.section}>
          <SectionHeader
            title="My activity"
            actionLabel="View all"
            onAction={() =>
              router.push({
                pathname: "/(app)/(tabs)/activity",
                params: { myActivityOnly: "1" },
              })
            }
          />
          <Card flush>
            {activityLoading ? (
              <View style={styles.activityState}>
                <Text style={styles.emptyText}>Loading recent activity…</Text>
              </View>
            ) : recentActivity.length === 0 ? (
              <View style={styles.activityState}>
                <Text style={styles.emptyText}>No recent activity yet.</Text>
              </View>
            ) : (
              recentActivity.map((item, index) => (
                <ActivityRow
                  key={item.id}
                  item={item}
                  divider={index < recentActivity.length - 1}
                />
              ))
            )}
          </Card>
        </View>
      )}
    </ScrollView>
  );
}

// ── Checked-out card ─────────────────────────────────────────────────────────
// Uses the shared <PressableCard> + <IconBadge> + <Pill> + <MetaRow>
// primitives — visual parity with the agent variant in KeySetsSection.

function CheckedOutCard({
  keySet,
  isAdmin,
  onPress,
}: {
  keySet: CheckedOutKeySet;
  isAdmin: boolean;
  onPress: () => void;
}) {
  const address =
    keySet.property?.address ??
    keySet.property?.formatted_address ??
    "Property";
  const suburb = keySet.property?.suburb;
  const overdue = isPastDue(keySet.due_back_at);
  const tone: IconBadgeTone = overdue ? "danger" : "warning";

  const holderName = keySet.current_holder?.full_name ?? "Unknown";
  const holderType = keySet.current_holder?.holder_type;
  const holderPhone = keySet.current_holder?.phone ?? null;
  const keyLabels = keySet.keys.map((k) => k.label);

  const metaItems = isAdmin
    ? [
        {
          label: "With",
          value:
            holderName +
            (holderType && holderType !== "agent" ? ` · ${holderType}` : ""),
          danger: overdue,
        },
        holderPhone
          ? { label: "Contact", value: holderPhone, danger: overdue }
          : keySet.due_back_at
            ? {
                label: overdue ? "Was due" : "Due",
                value: formatShortDate(keySet.due_back_at),
                danger: overdue,
              }
            : null,
      ].filter((x): x is { label: string; value: string; danger: boolean } =>
        Boolean(x),
      )
    : [];

  return (
    <PressableCard
      onPress={onPress}
      tone={overdue ? "danger" : "default"}
      flush
      accessibilityRole="button"
      accessibilityLabel={keySet.name}
    >
      {/* Top: icon + title + key pills */}
      <View style={cardStyles.top}>
        <IconBadge icon={KeyRound} tone={tone} size="lg" />
        <View style={cardStyles.info}>
          <View style={cardStyles.titleRow}>
            <Text style={cardStyles.name} numberOfLines={1}>
              {keySet.name}
            </Text>
            {keyLabels.length > 0 && (
              <Pill tone="neutral" size="sm">
                {keyLabels.length} {keyLabels.length === 1 ? "key" : "keys"}
              </Pill>
            )}
          </View>
          <Text style={cardStyles.subtitle} numberOfLines={1}>
            {address}
          </Text>
          {suburb ? (
            <Text style={cardStyles.subtitle} numberOfLines={1}>
              {suburb}
            </Text>
          ) : null}
          {keyLabels.length > 0 && (
            <View style={cardStyles.keyPills}>
              {keyLabels.map((label, i) => (
                <Pill key={i} tone="primary" variant="soft" size="sm">
                  {label}
                </Pill>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Holder meta — admin only */}
      {metaItems.length > 0 ? (
        <View style={cardStyles.metaWrap}>
          <MetaRow items={metaItems} />
        </View>
      ) : null}
    </PressableCard>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.screen, gap: theme.spacing.lg },
  section: { gap: theme.spacing.sm },
  cardList: { gap: theme.spacing.sm },
  activityState: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
});

const cardStyles = StyleSheet.create({
  top: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  info: { flex: 1, gap: 6, minWidth: 0 },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.colors.textMuted,
    marginTop: -2,
  },
  keyPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 2,
  },
  metaWrap: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
});

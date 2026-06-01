import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronRight, Clock3, KeyRound, UserRound } from "lucide-react-native";
import { useRouter } from "expo-router";

import {
  useMyActivity,
  type ActivityTransaction,
} from "@/hooks/useTransactions";
import { useCheckedOutKeys } from "@/hooks/useKeySets";
import { useCurrentUserId } from "@/hooks/useSession";
import { useRole } from "@/hooks/useRole";
import { theme } from "@/constants/theme";
import { MOVEMENT_CONFIG, getMovementLabel } from "@/constants/movements";
import {
  formatShortAddress,
  formatActivityTimestamp,
} from "@/lib/format";
import type { CheckedOutKey } from "@/services/keys.service";
import { KeyDashboardSummary } from "@/components/KeyDashboardSummary";
import { PropertiesNeedingAttention } from "@/components/PropertiesNeedingAttention";

// ── Group checked-out keys by property + holder ───────────────────────────────

type CheckedOutGroup = {
  groupKey: string;
  property: CheckedOutKey["property"];
  property_id: string;
  current_holder: CheckedOutKey["current_holder"];
  keyLabels: string[];
  due_back_at: string | null;
};

function groupCheckedOutKeys(keys: CheckedOutKey[]): CheckedOutGroup[] {
  const map = new Map<string, CheckedOutGroup>();
  for (const k of keys) {
    // Include due_back_at in the group key so separate checkout activities
    // at the same property by the same holder appear as separate cards.
    const groupKey = `${k.property_id}::${k.current_holder_id ?? "none"}::${k.due_back_at ?? "no-due"}`;
    const existing = map.get(groupKey);
    if (existing) {
      existing.keyLabels.push(k.label);
    } else {
      map.set(groupKey, {
        groupKey,
        property: k.property,
        property_id: k.property_id,
        current_holder: k.current_holder,
        keyLabels: [k.label],
        due_back_at: k.due_back_at,
      });
    }
  }
  // Sort by due date ascending (earliest first)
  return Array.from(map.values()).sort((a, b) => {
    if (!a.due_back_at && !b.due_back_at) return 0;
    if (!a.due_back_at) return 1;
    if (!b.due_back_at) return -1;
    return a.due_back_at.localeCompare(b.due_back_at);
  });
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAdmin } = useRole();
  const { data: checkedOut = [], isLoading: checkedOutLoading } =
    useCheckedOutKeys(6);
  const { data: activity = [], isLoading: activityLoading } = useMyActivity();

  const recentActivity = activity.slice(0, 4);
  const checkedOutGroups = groupCheckedOutKeys(checkedOut);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 96 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Key status summary — admin only */}
      {isAdmin && (
        <DashboardSection title="Key Status">
          <KeyDashboardSummary />
        </DashboardSection>
      )}
      {/* Current checked out */}
      <DashboardSection title="Current activity">
        <View style={styles.compactCard}>
          {checkedOutLoading ? (
            <Text style={styles.emptyText}>Loading checked out keys…</Text>
          ) : checkedOutGroups.length === 0 ? (
            <Text style={styles.emptyText}>No keys currently checked out.</Text>
          ) : (
            checkedOutGroups.map((group, index) => (
              <CheckedOutRow
                key={group.groupKey}
                group={group}
                showDivider={index < checkedOutGroups.length - 1}
                onPress={() => {
                  const params = new URLSearchParams();
                  if (group.due_back_at)
                    params.set("selectDueAt", group.due_back_at);
                  if (group.current_holder?.profile_id)
                    params.set(
                      "selectHolderId",
                      group.current_holder.profile_id,
                    );
                  const qs = params.toString() ? `?${params.toString()}` : "";
                  router.push(
                    `/(app)/properties/${group.property_id}${qs}` as never,
                  );
                }}
              />
            ))
          )}
        </View>
      </DashboardSection>

      {/* Properties needing attention — admin only */}
      {isAdmin && (
        <DashboardSection title="Needs Attention">
          <PropertiesNeedingAttention />
        </DashboardSection>
      )}

      {/* Recent activity */}
      <DashboardSection
        title="Recent activity"
        actionLabel="View all"
        onPressAction={() => router.push("/(app)/(tabs)/activity")}
      >
        <View style={styles.compactCard}>
          {activityLoading ? (
            <Text style={styles.emptyText}>Loading recent activity…</Text>
          ) : recentActivity.length === 0 ? (
            <Text style={styles.emptyText}>No recent activity yet.</Text>
          ) : (
            recentActivity.map((item, index) => (
              <ActivityRow
                key={item.id}
                item={item}
                showDivider={index < recentActivity.length - 1}
              />
            ))
          )}
        </View>
      </DashboardSection>
    </ScrollView>
  );
}

function DashboardSection({
  title,
  actionLabel,
  onPressAction,
  children,
}: {
  title: string;
  actionLabel?: string;
  onPressAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionLabel}>{title}</Text>
        {actionLabel && onPressAction ? (
          <Pressable
            onPress={onPressAction}
            style={({ pressed }) => [
              styles.sectionAction,
              pressed && styles.cardPressed,
            ]}
          >
            <Text style={styles.sectionActionText}>{actionLabel}</Text>
            <ChevronRight
              size={14}
              color={theme.colors.primary}
              strokeWidth={2}
            />
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function CheckedOutRow({
  group,
  showDivider,
  onPress,
}: {
  group: CheckedOutGroup;
  showDivider: boolean;
  onPress: () => void;
}) {
  const address =
    group.property?.address ?? group.property?.formatted_address ?? "Property";
  const location = formatPropertyLocation(group.property);
  const keysLine = group.keyLabels.join(" · ");
  const holderName = group.current_holder?.full_name ?? "Unknown holder";
  const holderType = group.current_holder?.holder_type;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.checkedOutRow,
        showDivider && styles.compactRowDivider,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={[styles.rowIcon, styles.checkedOutIcon]}>
        <KeyRound size={18} color={theme.colors.warning} strokeWidth={2} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {address}
        </Text>
        {location ? (
          <Text style={styles.locationText} numberOfLines={1}>
            {location}
          </Text>
        ) : null}
        <Text style={styles.keyLabel} numberOfLines={1}>
          {keysLine}
        </Text>
        <View style={styles.holderContactRow}>
          <UserRound
            size={13}
            color={theme.colors.primary}
            strokeWidth={2}
          />
          <Text style={styles.holderContactLabel} numberOfLines={1}>
            {holderName}
            {holderType ? ` · ${holderType}` : ""}
          </Text>
        </View>
      </View>
      <ChevronRight size={16} color={theme.colors.textLight} strokeWidth={2} />
    </Pressable>
  );
}

function formatPropertyLocation(property: CheckedOutKey["property"]): string {
  if (!property) return "";
  return [property.suburb, property.city, property.postcode]
    .filter((part, index, parts) => {
      if (!part) return false;
      return (
        parts.findIndex((v) => v?.toLowerCase() === part.toLowerCase()) ===
        index
      );
    })
    .join(" · ");
}

function ActivityRow({
  item,
  showDivider,
}: {
  item: ActivityTransaction;
  showDivider: boolean;
}) {
  const currentUserId = useCurrentUserId();
  const movement = MOVEMENT_CONFIG[item.transaction_type];
  const address = formatShortAddress(item.property);
  const ActivityIcon = movement.Icon;
  const label = getMovementLabel(item, currentUserId);

  return (
    <View style={[styles.compactRow, showDivider && styles.compactRowDivider]}>
      <View style={[styles.rowIcon, { backgroundColor: movement.bg }]}>
        <ActivityIcon size={16} color={movement.color} strokeWidth={2} />
      </View>
      <View style={styles.rowContent}>
        <Text
          style={[styles.recentActivityTitle, { color: movement.color }]}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Text style={styles.rowSubtitle} numberOfLines={1}>
          {address}
        </Text>
        <View style={styles.activityMetaRow}>
          <Clock3 size={12} color={theme.colors.textLight} strokeWidth={2} />
          <Text style={styles.rowMeta} numberOfLines={1}>
            {formatActivityTimestamp(item.created_at)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.screen, gap: theme.spacing.lg },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  section: { gap: theme.spacing.sm },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  sectionAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingLeft: theme.spacing.sm,
  },
  sectionActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  compactCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  cardPressed: { opacity: 0.7 },
  compactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
  },
  checkedOutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surfaceWarm,
  },
  compactRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  checkedOutIcon: {
    width: 38,
    height: 38,
    backgroundColor: theme.colors.warningSoft,
  },
  rowContent: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text,
  },
  recentActivityTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  locationText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textLight,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  rowSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.colors.textMuted,
  },
  rowMeta: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textLight,
  },
  holderContactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: theme.spacing.xs,
  },
  holderContactLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.primaryDark,
  },
  activityMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  keyLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  emptyText: {
    padding: theme.spacing.md,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
});

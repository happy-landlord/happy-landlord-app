import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronRight, Clock3, KeyRound } from "lucide-react-native";
import { useRouter } from "expo-router";
import {
  useMyActivity,
  type ActivityTransaction,
} from "@/hooks/useTransactions";
import { useCheckedOutKeySets, useKeySetsNeedingAttention } from "@/hooks/useKeySets";
import { useCurrentUserId } from "@/hooks/useSession";
import { useRole } from "@/hooks/useRole";
import { theme } from "@/constants/theme";
import { MOVEMENT_CONFIG, getMovementLabel } from "@/constants/movements";
import {
  formatShortAddress,
  formatActivityTimestamp,
} from "@/lib/format";
import type { CheckedOutKeySet } from "@/services/keySets.service";
import { KeyDashboardSummary } from "@/components/KeyDashboardSummary";
import { PropertiesNeedingAttention } from "@/components/PropertiesNeedingAttention";

// ── Sort checked-out keysets ──────────────────────────────────────────────────

function sortCheckedOutKeySets(keys: CheckedOutKeySet[]): CheckedOutKeySet[] {
  // Sort by due date ascending (earliest first)
  return [...keys].sort((a, b) => {
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
  const currentUserId = useCurrentUserId();
  const { data: checkedOut = [], isLoading: checkedOutLoading } =
    useCheckedOutKeySets(isAdmin ? 20 : 50);
  const { data: activity = [], isLoading: activityLoading } = useMyActivity();
  // activity only shown for agents — still fetched so it's ready when needed
  const { data: needsAttention = [], isLoading: attentionLoading } =
    useKeySetsNeedingAttention();

  const recentActivity = activity.slice(0, 4);

  // Admins see all checked-out keysets; agents see only their own
  const checkedOutKeySets = sortCheckedOutKeySets(
    isAdmin
      ? checkedOut
      : checkedOut.filter(
          (ks) => ks.current_holder?.profile_id === currentUserId,
        ),
  );

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
        <DashboardSection title="Keyset status">
          <KeyDashboardSummary />
        </DashboardSection>
      )}
      {/* Current checked out — only when there are items or loading */}
      {(checkedOutLoading || checkedOutKeySets.length > 0) && (
        <DashboardSection title="Keysets Checked Out">
          {checkedOutLoading ? (
            <View style={styles.compactCard}>
              <Text style={styles.emptyText}>Loading checked out keysets…</Text>
            </View>
          ) : (
            <View style={styles.cardList}>
              {checkedOutKeySets.map((keySet) => (
                <CheckedOutRow
                  key={keySet.id}
                  keySet={keySet}
                  isAdmin={isAdmin}
                  onPress={() =>
                    router.push(`/(app)/properties/keyset/${keySet.id}` as never)
                  }
                />
              ))}
            </View>
          )}
        </DashboardSection>
      )}

      {/* Properties needing attention — admin only, hidden when empty */}
      {isAdmin && (attentionLoading || needsAttention.length > 0) && (
        <DashboardSection title="Needs Attention">
          <PropertiesNeedingAttention data={needsAttention} isLoading={attentionLoading} />
        </DashboardSection>
      )}

      {/* My activity — agents only */}
      {!isAdmin && (
        <DashboardSection
          title="My activity"
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
      )}
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
  keySet,
  isAdmin,
  onPress,
}: {
  keySet: CheckedOutKeySet;
  isAdmin: boolean;
  onPress: () => void;
}) {
  const address = keySet.property?.address ?? keySet.property?.formatted_address ?? "Property";
  const suburb = keySet.property?.suburb;
  const holderName = keySet.current_holder?.full_name ?? "Unknown";
  const holderType = keySet.current_holder?.holder_type;
  const holderPhone = keySet.current_holder?.phone ?? null;
  const keyLabels = keySet.keys.map((key) => key.label);
  const isOverdue = keySet.due_back_at ? new Date(keySet.due_back_at) < new Date() : false;

  const iconBg = isOverdue ? theme.colors.dangerSoft : theme.colors.warningSoft;
  const iconColor = isOverdue ? theme.colors.danger : theme.colors.warning;
  const cardBorderColor = isOverdue ? theme.colors.danger : theme.colors.border;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [coStyles.card, { borderColor: cardBorderColor }, pressed && coStyles.cardPressed]}
      accessibilityRole="button"
    >
      {/* Top row: icon + name + key pills */}
      <View style={coStyles.top}>
        <View style={[coStyles.iconWrap, { backgroundColor: iconBg }]}>
          <KeyRound size={22} color={iconColor} strokeWidth={1.8} />
        </View>
        <View style={coStyles.info}>
          <View style={coStyles.titleRow}>
            <Text style={coStyles.name} numberOfLines={1}>{keySet.name}</Text>
            {keyLabels.length > 0 && (
              <View style={coStyles.countPill}>
                <Text style={coStyles.countText}>
                  {keyLabels.length} {keyLabels.length === 1 ? "key" : "keys"}
                </Text>
              </View>
            )}
          </View>
          <Text style={coStyles.suburb} numberOfLines={1}>{address}</Text>
          {suburb ? (
            <Text style={coStyles.suburb} numberOfLines={1}>{suburb}</Text>
          ) : null}
          {keyLabels.length > 0 && (
            <View style={coStyles.keyPillsWrap}>
              {keyLabels.map((label, i) => (
                <View key={i} style={coStyles.keyPill}>
                  <Text style={coStyles.keyPillText} numberOfLines={1}>{label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Meta row: admin only */}
      {isAdmin && (
        <View style={coStyles.meta}>
          <View style={coStyles.metaDivider} />
          <View style={coStyles.metaContent}>
            <View style={coStyles.metaItem}>
              <Text style={coStyles.metaLabel}>With</Text>
              <Text style={[coStyles.metaValue, isOverdue && coStyles.metaValueDanger]} numberOfLines={1}>
                {holderName}{holderType && holderType !== "agent" ? ` · ${holderType}` : ""}
              </Text>
            </View>
            {holderPhone ? (
              <View style={coStyles.metaItem}>
                <Text style={coStyles.metaLabel}>Contact</Text>
                <Text style={[coStyles.metaValue, isOverdue && coStyles.metaValueDanger]} numberOfLines={1}>
                  {holderPhone}
                </Text>
              </View>
            ) : keySet.due_back_at ? (
              <View style={coStyles.metaItem}>
                <Text style={coStyles.metaLabel}>{isOverdue ? "Was due" : "Due"}</Text>
                <Text style={[coStyles.metaValue, isOverdue && coStyles.metaValueDanger]} numberOfLines={1}>
                  {new Date(keySet.due_back_at).toLocaleDateString("en-AU", {
                    weekday: "short", day: "numeric", month: "short",
                  })}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      )}
    </Pressable>
  );
}

function formatPropertyLocation(property: CheckedOutKeySet["property"]): string {
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

// kept for potential future use
void formatPropertyLocation;

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
  compactRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  cardList: {
    gap: theme.spacing.sm,
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
  },  rowContent: {
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
  },  rowSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.colors.textMuted,
  },
  rowMeta: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textLight,
  },
  keyLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  activityMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  emptyText: {
    padding: theme.spacing.md,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
});

// ── Checked-out card styles (mirrors AgentKeySetCard) ─────────────────────────
const coStyles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
  },
  cardPressed: { opacity: 0.72 },
  top: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
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
  suburb: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.colors.textMuted,
    marginTop: -2,
  },
  countPill: {
    flexShrink: 0,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: theme.colors.neutralSoft,
  },
  countText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  keyPillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  keyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: theme.colors.primarySoft,
  },
  keyPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.primaryDark,
  },
  meta: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  metaDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  metaContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  metaItem: { flex: 1, gap: 2 },
  metaLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
  },
  metaValueDanger: { color: theme.colors.danger },
});

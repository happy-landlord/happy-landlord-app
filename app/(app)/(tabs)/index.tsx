import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronRight, Clock3, KeyRound } from "lucide-react-native";
import { useRouter } from "expo-router";

import { useRole } from "@/hooks/useRole";
import { useMyActivity, type ActivityMovement } from "@/hooks/useKeyMovements";
import { useCheckedOutKeySets } from "@/hooks/useKeySets";
import { theme } from "@/constants/theme";
import { MOVEMENT_CONFIG } from "@/constants/movements";
import {
  formatShortAddress,
  formatActivityTimestamp,
  formatReturnDueLabel,
  isPastDue,
} from "@/lib/format";
import type { CheckedOutKeySet } from "@/services/keys.service";


export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAdmin } = useRole();
  const { data: checkedOut = [], isLoading: checkedOutLoading } = useCheckedOutKeySets(4);
  const { data: activity = [], isLoading: activityLoading } = useMyActivity();

  const recentActivity = activity.slice(0, 4);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + theme.spacing.xl }]}
      showsVerticalScrollIndicator={false}
    >

      {/* Current checked out */}
      <DashboardSection
        title="Current activity"
      >
        <View style={styles.compactCard}>
          {checkedOutLoading ? (
            <Text style={styles.emptyText}>Loading checked out keys…</Text>
          ) : checkedOut.length === 0 ? (
            <Text style={styles.emptyText}>No keys currently checked out.</Text>
          ) : (
            checkedOut.map((keySet, index) => (
              <CheckedOutRow
                key={keySet.id}
                keySet={keySet}
                showDivider={index < checkedOut.length - 1}
                showHolder={isAdmin}
                onPress={() =>
                  router.push(
                    `/(app)/properties/${keySet.property_id}/keysets/${keySet.id}` as never,
                  )
                }
              />
            ))
          )}
        </View>
      </DashboardSection>

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
            style={({ pressed }) => [styles.sectionAction, pressed && styles.cardPressed]}
          >
            <Text style={styles.sectionActionText}>{actionLabel}</Text>
            <ChevronRight size={14} color={theme.colors.primary} strokeWidth={2} />
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function CheckedOutRow({
  keySet,
  showDivider,
  showHolder,
  onPress,
}: {
  keySet: CheckedOutKeySet;
  showDivider: boolean;
  showHolder: boolean;
  onPress: () => void;
}) {
  const address = keySet.property?.address ?? keySet.property?.formatted_address ?? "Property";
  const location = formatPropertyLocation(keySet.property);
  const holderName = showHolder ? keySet.current_holder?.full_name : null;
  const isReturnOverdue = isPastDue(keySet.due_back_at);

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
        <Text style={styles.rowTitle} numberOfLines={1}>{address}</Text>
        {location ? (
          <Text style={styles.locationText} numberOfLines={1}>{location}</Text>
        ) : null}
        {holderName ? (
          <Text style={styles.rowSubtitle} numberOfLines={1}>With {holderName}</Text>
        ) : null}
        <View style={styles.returnByRow}>
          <Clock3 size={13} color={isReturnOverdue ? theme.colors.danger : theme.colors.primary} strokeWidth={2} />
          <Text style={[styles.returnLabel, isReturnOverdue && styles.returnLabelOverdue]} numberOfLines={1}>
            {formatReturnDueLabel(keySet.due_back_at)}
          </Text>
        </View>
      </View>
      <ChevronRight size={16} color={theme.colors.textLight} strokeWidth={2} />
    </Pressable>
  );
}

function formatPropertyLocation(property: CheckedOutKeySet["property"]): string {
  if (!property) return "";

  return [property.suburb, property.city, property.postcode]
    .filter((part, index, parts) => {
      if (!part) return false;
      return parts.findIndex((value) => value?.toLowerCase() === part.toLowerCase()) === index;
    })
    .join(" · ");
}


function ActivityRow({ item, showDivider }: { item: ActivityMovement; showDivider: boolean }) {
  const movement = MOVEMENT_CONFIG[item.movement_type];
  const property = item.key_set?.property;
  const address = formatShortAddress(property);
  const ActivityIcon = movement.Icon;

  return (
    <View style={[styles.compactRow, showDivider && styles.compactRowDivider]}>
      <View style={[styles.rowIcon, { backgroundColor: movement.bg }]}>
        <ActivityIcon size={16} color={movement.color} strokeWidth={2} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.recentActivityTitle, { color: movement.color }]} numberOfLines={1}>
          {movement.label}
        </Text>
        <Text style={styles.rowSubtitle} numberOfLines={1}>{address}</Text>
        <View style={styles.activityMetaRow}>
          <Clock3 size={12} color={theme.colors.textLight} strokeWidth={2} />
          <Text style={styles.rowMeta} numberOfLines={1}>{formatActivityTimestamp(item.created_at)}</Text>
        </View>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.screen, gap: theme.spacing.lg },
  sectionLabel: {
    fontSize: 13, fontWeight: "600", color: theme.colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.6,
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
  returnByRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: theme.spacing.xs,
  },
  returnLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.primaryDark,
  },
  returnLabelOverdue: {
    color: theme.colors.danger,
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

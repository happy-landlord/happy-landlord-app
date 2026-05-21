import React, { useMemo, useRef, useState } from "react";
import {
  SectionList,
  Text,
  View,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Plus,
  LogOut,
  LogIn,
  Clock,
  AlertTriangle,
  XCircle,
  FileText,
} from "lucide-react-native";

import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  AddressSearchBar,
  type AddressSearchBarRef,
} from "@/components/ui/AddressSearchBar";
import type { PlaceResult } from "@/components/ui/AddressSearch";
import { useSession } from "@/hooks/useSession";
import { useRole } from "@/hooks/useRole";
import { useMyActivity } from "@/hooks/useKeyMovements";
import { theme } from "@/constants/theme";
import type { ActivityMovement, KeyMovementType } from "@/types/database";

// ─── Movement display config ────────────────────────────────────────────────

type MovementConfig = {
  label: string;
  Icon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
  color: string;
  bg: string;
};

const MOVEMENT_CONFIG: Record<KeyMovementType, MovementConfig> = {
  created: {
    label: "Key Set Created",
    Icon: Plus,
    color: theme.colors.success,
    bg: theme.colors.successSoft,
  },
  borrowed: {
    label: "Keys Borrowed",
    Icon: LogOut,
    color: theme.colors.warning,
    bg: theme.colors.warningSoft,
  },
  returned: {
    label: "Keys Returned",
    Icon: LogIn,
    color: theme.colors.success,
    bg: theme.colors.successSoft,
  },
  reserved: {
    label: "Keys Reserved",
    Icon: Clock,
    color: theme.colors.info,
    bg: theme.colors.infoSoft,
  },
  marked_overdue: {
    label: "Marked Overdue",
    Icon: AlertTriangle,
    color: theme.colors.danger,
    bg: theme.colors.dangerSoft,
  },
  marked_lost: {
    label: "Marked as Lost",
    Icon: XCircle,
    color: theme.colors.danger,
    bg: theme.colors.dangerSoft,
  },
  notes_updated: {
    label: "Notes Updated",
    Icon: FileText,
    color: theme.colors.neutral,
    bg: theme.colors.neutralSoft,
  },
};

// ─── Date helpers ────────────────────────────────────────────────────────────

function toDateLabel(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const todayStr = now.toDateString();
  const dateStr = date.toDateString();

  if (dateStr === todayStr) return "Today";

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ─── Title builder ────────────────────────────────────────────────────────────

type HolderSnap =
  | ActivityMovement["to_holder"]
  | ActivityMovement["from_holder"];

function resolveHolderName(
  holder: HolderSnap,
  userId: string | undefined,
): string | null {
  if (!holder) return null;
  if (userId && holder.profile_id === userId) return "You";
  return (
    holder.full_name ?? (holder.holder_type === "agent" ? "Agent" : "Tenant")
  );
}

function buildTitle(
  item: ActivityMovement,
  userId: string | undefined,
): string {
  const to = resolveHolderName(item.to_holder, userId);
  const from = resolveHolderName(item.from_holder, userId);

  switch (item.movement_type) {
    case "borrowed":
      // [to] borrowed from [from]
      return [to ?? "Someone", "borrowed", from ? `from ${from}` : null]
        .filter(Boolean)
        .join(" ");
    case "returned":
      // [from] returned to [to]
      return [from ?? "Someone", "returned", to ? `to ${to}` : null]
        .filter(Boolean)
        .join(" ");
    case "reserved":
      // [to] reserved
      return [to ?? "Someone", "reserved"].filter(Boolean).join(" ");
    case "marked_overdue":
      // [from/to] is overdue
      return [from ?? to ?? "Key", "is overdue"].filter(Boolean).join(" ");
    case "marked_lost":
      // [from/to] reported lost
      return [from ?? to ?? "Key", "reported lost"].filter(Boolean).join(" ");
    case "created":
      return "Key set created";
    case "notes_updated":
      return "Notes updated";
    default:
      return item.movement_type;
  }
}

// ─── Section grouping ────────────────────────────────────────────────────────

type Section = {
  title: string;
  data: ActivityMovement[];
};

function groupByDate(movements: ActivityMovement[]): Section[] {
  const map: Map<string, ActivityMovement[]> = new Map();

  for (const m of movements) {
    const label = toDateLabel(m.created_at);
    const existing = map.get(label);
    if (existing) {
      existing.push(m);
    } else {
      map.set(label, [m]);
    }
  }

  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

// ─── Activity item ───────────────────────────────────────────────────────────

function ActivityItem({
  item,
  userId,
}: {
  item: ActivityMovement;
  userId: string | undefined;
}) {
  const { Icon, color, bg } = MOVEMENT_CONFIG[item.movement_type];

  const title = buildTitle(item, userId);

  const propertyLine =
    item.key_set?.property?.formatted_address ??
    [item.key_set?.property?.address, item.key_set?.property?.suburb]
      .filter(Boolean)
      .join(", ") ??
    "—";

  const setCode = item.key_set?.set_code ?? "—";

  const detail = item.due_back_at
    ? `Due: ${new Date(item.due_back_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}`
    : null;

  return (
    <View style={styles.item}>
      <View style={[styles.iconBadge, { backgroundColor: bg }]}>
        <Icon size={18} color={color} strokeWidth={2} />
      </View>

      <View style={styles.itemContent}>
        <View style={styles.itemTop}>
          <Text style={[styles.itemLabel, { color }]} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.itemTime}>{formatTime(item.created_at)}</Text>
        </View>
        <Text style={styles.itemAddress} numberOfLines={1}>
          {propertyLine}
        </Text>
        <Text style={styles.itemSetCode}>Set {setCode}</Text>
        {detail ? <Text style={styles.itemDetail}>{detail}</Text> : null}
        {item.notes ? (
          <Text style={styles.itemNotes} numberOfLines={2}>
            {item.notes}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const { isAdmin } = useRole();
  const userId = session?.user.id;
  const { data, isLoading, isError, refetch, isFetching } = useMyActivity();

  const searchRef = useRef<AddressSearchBarRef>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);

  const filtered = useMemo(() => {
    const all = data ?? [];
    if (!selectedPlace) return all;
    const suburb = selectedPlace.suburb?.toLowerCase();
    const street = selectedPlace.description.split(",")[0].trim().toLowerCase();
    return all.filter((m) => {
      const propSuburb = m.key_set?.property?.suburb?.toLowerCase() ?? "";
      const propAddr = (
        m.key_set?.property?.formatted_address ??
        [m.key_set?.property?.address, m.key_set?.property?.suburb]
          .filter(Boolean)
          .join(" ")
      ).toLowerCase();
      if (suburb && propSuburb.includes(suburb)) return true;
      return propAddr.includes(street);
    });
  }, [data, selectedPlace]);

  const sections = useMemo(() => groupByDate(filtered), [filtered]);

  if (isLoading) {
    return (
      <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
        <LoadingState message="Loading activity…" />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
      <AddressSearchBar
        ref={searchRef}
        placeholder="Filter by property address…"
        selectedPlace={selectedPlace}
        resultCount={filtered.length}
        resultLabel={["movement", "movements"]}
        onSelect={setSelectedPlace}
        onClear={() => {
          setSelectedPlace(null);
          searchRef.current?.clear();
        }}
      />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        style={styles.sectionList}
        contentContainerStyle={[
          styles.list,
          filtered.length === 0 && styles.listEmpty,
        ]}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
          />
        }
        ListHeaderComponent={
          isError ? (
            <ErrorState
              title="Couldn't load activity"
              message="Pull down to try again."
            />
          ) : null
        }
        ListEmptyComponent={
          !isError ? (
            <EmptyState
              title={selectedPlace ? "No results" : "No activity yet"}
              message={
                selectedPlace
                  ? `No movements for "${selectedPlace.suburb ?? selectedPlace.description.split(",")[0].trim()}"`
                  : isAdmin
                    ? "No key movements have been recorded yet."
                    : "Key movements you record will appear here."
              }
            />
          ) : null
        }
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        renderItem={({ item }) => <ActivityItem item={item} userId={userId} />}
        SectionSeparatorComponent={() => <View style={styles.sectionSep} />}
        ItemSeparatorComponent={() => <View style={styles.itemSep} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // ── List ──────────────────────────────────────────────────────────────────
  sectionList: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  list: {
    paddingHorizontal: theme.spacing.screen,
    paddingBottom: theme.spacing.xl,
  },
  listEmpty: {
    flexGrow: 1,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  sectionSep: {
    height: 0,
  },
  itemSep: {
    height: 10,
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  itemContent: {
    flex: 1,
    gap: 2,
  },
  itemTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  itemTime: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  itemAddress: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: "500",
  },
  itemSetCode: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  itemDetail: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  itemNotes: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginTop: 4,
    fontStyle: "italic",
  },
});

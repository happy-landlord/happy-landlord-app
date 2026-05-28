import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  AlertTriangle,
  Building2,
  ChevronRight,
  Clock3,
} from "lucide-react-native";
import { useRouter } from "expo-router";

import { theme } from "@/constants/theme";
import { useKeysNeedingAttention } from "@/hooks/useKeySets";
import type { CheckedOutKey } from "@/services/keys.service";

// ── Group by property ─────────────────────────────────────────────────────────

type AttentionProperty = {
  propertyId: string;
  address: string;
  unitNumber: string | null;
  suburb: string;
  city: string;
  postcode: string | null;
  lostCount: number;
  overdueItems: { holderName: string | null; count: number }[];
};

function groupByProperty(keys: CheckedOutKey[]): AttentionProperty[] {
  const map = new Map<string, AttentionProperty>();

  for (const k of keys) {
    if (!k.property) continue;
    const pid = k.property_id;
    if (!map.has(pid)) {
      map.set(pid, {
        propertyId: pid,
        address: k.property.address,
        unitNumber: null,
        suburb: k.property.suburb,
        city: k.property.city,
        postcode: k.property.postcode,
        lostCount: 0,
        overdueItems: [],
      });
    }
    const entry = map.get(pid)!;

    if (k.status === "lost") {
      entry.lostCount += 1;
    } else if (k.status === "overdue") {
      const holderName = k.current_holder?.full_name ?? null;
      const existing = entry.overdueItems.find(
        (o) => o.holderName === holderName,
      );
      if (existing) {
        existing.count += 1;
      } else {
        entry.overdueItems.push({ holderName, count: 1 });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    // Sort: properties with lost keys first, then overdue
    if (a.lostCount !== b.lostCount) return b.lostCount - a.lostCount;
    const aOverdue = a.overdueItems.reduce((s, o) => s + o.count, 0);
    const bOverdue = b.overdueItems.reduce((s, o) => s + o.count, 0);
    return bOverdue - aOverdue;
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AttentionCard({
  item,
  onPress,
}: {
  item: AttentionProperty;
  onPress: () => void;
}) {
  const locationParts = [item.suburb, item.city, item.postcode]
    .filter(Boolean)
    .filter(
      (v, i, arr) =>
        arr.findIndex((x) => x?.toLowerCase() === v?.toLowerCase()) === i,
    )
    .join(", ");


  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.address} needs attention`}
    >
      {/* Icon */}
      <View style={styles.iconWrap}>
        <Building2 size={20} color={theme.colors.danger} strokeWidth={1.8} />
      </View>

      {/* Info */}
      <View style={styles.cardContent}>
        <Text style={styles.address} numberOfLines={1}>
          {item.unitNumber
            ? `${item.unitNumber}/${item.address}`
            : item.address}
        </Text>
        {locationParts ? (
          <Text style={styles.location} numberOfLines={1}>
            {locationParts}
          </Text>
        ) : null}

        {/* Alert badges */}
        <View style={styles.badges}>
          {item.lostCount > 0 && (
            <View style={styles.badge}>
              <AlertTriangle
                size={12}
                color={theme.colors.danger}
                strokeWidth={2}
              />
              <Text style={styles.badgeLost}>
                {item.lostCount} missing {item.lostCount === 1 ? "key" : "keys"}
              </Text>
            </View>
          )}
          {item.overdueItems.map((o, i) => (
            <View key={i} style={styles.badge}>
              <Clock3 size={12} color={theme.colors.warning} strokeWidth={2} />
              <Text style={styles.badgeOverdue} numberOfLines={1}>
                {o.count} overdue{o.holderName ? ` · ${o.holderName}` : ""}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <ChevronRight size={16} color={theme.colors.textLight} strokeWidth={2} />
    </Pressable>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PropertiesNeedingAttention() {
  const router = useRouter();
  const { data = [], isLoading } = useKeysNeedingAttention();

  const properties = groupByProperty(data);

  if (isLoading) {
    return (
      <View style={styles.compactCard}>
        <Text style={styles.emptyText}>Checking for issues…</Text>
      </View>
    );
  }

  if (properties.length === 0) {
    return (
      <View style={styles.compactCard}>
        <Text style={styles.emptyText}>
          No issues detected. All keys are accounted for.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {properties.map((item) => (
        <AttentionCard
          key={item.propertyId}
          item={item}
          onPress={() =>
            router.push(`/(app)/properties/${item.propertyId}` as never)
          }
        />
      ))}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  list: { gap: 8 },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  cardPressed: { opacity: 0.72 },

  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  cardContent: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  address: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text,
  },
  location: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.colors.textMuted,
  },

  // ── Badges ────────────────────────────────────────────────────────────────
  badges: {
    gap: 4,
    marginTop: 4,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  badgeLost: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.danger,
  },
  badgeOverdue: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.warning,
  },

  // ── Empty / loading ───────────────────────────────────────────────────────
  compactCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  emptyText: {
    padding: theme.spacing.md,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
});

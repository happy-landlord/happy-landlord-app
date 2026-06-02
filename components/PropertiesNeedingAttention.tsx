import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  AlertTriangle,
  Building2,
  ChevronRight,
  Clock3,
} from "lucide-react-native";
import { useRouter } from "expo-router";

import { theme } from "@/constants";
import type { KeySetNeedingAttention } from "@/lib/services";

// ── Sort helpers ──────────────────────────────────────────────────────────────

function sortAttentionKeysets(
  keysets: KeySetNeedingAttention[],
): KeySetNeedingAttention[] {
  return [...keysets]
    .filter((item) => item.property)
    .sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "missing_damaged" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AttentionCard({
  item,
  onPress,
}: {
  item: KeySetNeedingAttention;
  onPress: () => void;
}) {
  const property = item.property;
  const locationParts = [property?.suburb, property?.city, property?.postcode]
    .filter(Boolean)
    .filter(
      (v, i, arr) =>
        arr.findIndex((x) => x?.toLowerCase() === v?.toLowerCase()) === i,
    )
    .join(", ");
  const isMissing = item.status === "missing_damaged";
  const holderName = item.current_holder?.full_name ?? null;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.name} needs attention`}
    >
      {/* Icon */}
      <View style={styles.iconWrap}>
        <Building2 size={20} color={theme.colors.danger} strokeWidth={1.8} />
      </View>

      {/* Info */}
      <View style={styles.cardContent}>
        <Text style={styles.address} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.propertyAddress} numberOfLines={1}>
          {property?.address ?? "Property"}
        </Text>
        {locationParts ? (
          <Text style={styles.location} numberOfLines={1}>
            {locationParts}
          </Text>
        ) : null}

        {/* Alert badges */}
        <View style={styles.badges}>
          {isMissing ? (
            <View style={styles.badge}>
              <AlertTriangle
                size={12}
                color={theme.colors.danger}
                strokeWidth={2}
              />
              <Text style={styles.badgeLost}>Missing or damaged</Text>
            </View>
          ) : (
            <View style={styles.badge}>
              <Clock3 size={12} color={theme.colors.warning} strokeWidth={2} />
              <Text style={styles.badgeOverdue} numberOfLines={1}>
                Overdue{holderName ? ` · ${holderName}` : ""}
              </Text>
            </View>
          )}
        </View>
      </View>

      <ChevronRight size={16} color={theme.colors.textLight} strokeWidth={2} />
    </Pressable>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PropertiesNeedingAttention({
  data = [],
  isLoading = false,
}: {
  data?: KeySetNeedingAttention[];
  isLoading?: boolean;
}) {
  const router = useRouter();

  const keysets = sortAttentionKeysets(data);

  if (isLoading) {
    return (
      <View style={styles.compactCard}>
        <Text style={styles.emptyText}>Checking for issues…</Text>
      </View>
    );
  }

  if (keysets.length === 0) {
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
      {keysets.map((item) => (
        <AttentionCard
          key={item.id}
          item={item}
          onPress={() =>
            router.push(`/(app)/properties/keyset/${item.id}` as never)
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
  propertyAddress: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textMuted,
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

import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight, MapPin } from "lucide-react-native";

import type { DbProperty } from "@/types/database";
import { useRole } from "@/hooks/useRole";
import { useCurrentUserId } from "@/hooks/useSession";
import { PROPERTY_TYPE_LABEL } from "@/components/property/add/types";
import { QUERY_KEYS } from "@/constants/queryKeys";
import {
  fetchKeySetsForProperty,
  type KeySetWithDetails,
} from "@/services/keySets.service";
import { theme } from "@/constants/theme";

type PropertyCardProps = {
  property: DbProperty;
};

/**
 * Pick the keyset an agent should land on for a property:
 *  1. A keyset currently checked out (or overdue) by the agent.
 *  2. Otherwise the first available keyset.
 *  3. Otherwise null → fall back to the property page.
 */
function pickAgentKeySet(
  keySets: KeySetWithDetails[],
  userId: string | null | undefined,
): KeySetWithDetails | null {
  if (keySets.length === 0) return null;
  const mine = keySets.find(
    (ks) =>
      (ks.status === "checked_out" || ks.status === "overdue") &&
      ks.current_holder?.profile_id === userId,
  );
  if (mine) return mine;
  return keySets.find((ks) => ks.status === "available") ?? null;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAdmin } = useRole();
  const currentUserId = useCurrentUserId();

  const location = [property.suburb, property.city, property.postcode]
    .filter(Boolean)
    .join(", ");

  const title = property.unit_number
    ? `${property.unit_number}/${property.address}`
    : property.address;

  const handlePress = async () => {
    const propertyHref = `/(app)/properties/${property.id}` as const;

    // Admins always go to the full property page.
    if (isAdmin) {
      router.push(propertyHref as never);
      return;
    }

    // Agents: resolve the best keyset (cached when fresh) before navigating.
    try {
      const keySets = await queryClient.fetchQuery({
        queryKey: QUERY_KEYS.keySets.byProperty(property.id),
        queryFn: () => fetchKeySetsForProperty(property.id),
        staleTime: 1000 * 30,
      });
      const target = pickAgentKeySet(keySets, currentUserId);
      if (target) {
        router.push(`/(app)/properties/keyset/${target.id}` as never);
        return;
      }
    } catch {
      // Swallow and fall through to the property page.
    }
    router.push(propertyHref as never);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      {/* Text */}
      <View style={styles.content}>
        {/* Type badge */}
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>
            {PROPERTY_TYPE_LABEL[property.property_type] ?? property.property_type}
          </Text>
        </View>

        {/* Street address */}
        <Text style={styles.address} numberOfLines={1}>
          {title}
        </Text>

        {/* Location row */}
        <View style={styles.metaRow}>
          <MapPin size={11} color={theme.colors.textLight} strokeWidth={1.8} />
          <Text style={styles.location} numberOfLines={1}>
            {location}
          </Text>
        </View>
      </View>

      <ChevronRight size={18} color={theme.colors.textLight} strokeWidth={1.8} style={styles.chevron} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
  },
  cardPressed: {
    backgroundColor: theme.colors.neutralSoft,
  },
  content: {
    flex: 1,
    gap: 4,
    padding: theme.spacing.md,
    minWidth: 0,
  },
  chevron: {
    marginRight: theme.spacing.sm,
  },
  typeBadge: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  address: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  location: {
    fontSize: 12,
    color: theme.colors.textMuted,
    flex: 1,
  },
});

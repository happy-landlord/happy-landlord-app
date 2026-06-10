import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight, MapPin } from "lucide-react-native";

import type { DbProperty } from "@/types";
import { useRole } from "@/hooks";
import { useCurrentUserId } from "@/lib/hooks";
import { theme, PROPERTY_TYPE_LABEL } from "@/constants";
import { QUERY_KEYS } from "@/lib/query";
import {
  fetchKeySetsForProperty,
  type KeySetWithDetails,
} from "@/lib/services";
import { Pill, PressableCard } from "@/components/ui";

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

  const location = property.suburb || property.city || "";

  const title = property.unit_number
    ? `${property.unit_number}/${property.address}`
    : property.address;

  const handlePress = async () => {
    const propertyHref = `/(app)/properties/${property.id}` as const;

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
    <PressableCard onPress={handlePress} flush style={styles.row}>
      <View style={styles.body}>
        <Pill tone="accent" size="sm">
          {PROPERTY_TYPE_LABEL[property.property_type] ??
            property.property_type}
        </Pill>

        <Text style={styles.address} numberOfLines={1}>
          {title}
        </Text>

        <View style={styles.metaRow}>
          <MapPin size={11} color={theme.colors.textLight} strokeWidth={1.8} />
          <Text style={styles.location} numberOfLines={1}>
            {location}
          </Text>
        </View>
      </View>

      <ChevronRight
        size={18}
        color={theme.colors.textLight}
        strokeWidth={1.8}
        style={styles.chevron}
      />
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  body: {
    flex: 1,
    gap: 4,
    padding: theme.spacing.md,
    minWidth: 0,
  },
  chevron: {
    marginRight: theme.spacing.sm,
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

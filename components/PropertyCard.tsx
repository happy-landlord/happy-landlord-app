import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Building2, ChevronRight, MapPin, KeyRound } from "lucide-react-native";

import type { Property } from "@/services/properties.service";
import { theme } from "@/constants/theme";

type PropertyCardProps = {
  property: Property;
};

const PROPERTY_TYPE_LABEL: Record<string, string> = {
  house: "House",
  townhouse: "Townhouse",
  apartment: "Apartment",
  unit: "Unit",
  duplex: "Duplex",
  villa: "Villa",
  other: "Other",
};

export function PropertyCard({ property }: PropertyCardProps) {
  const router = useRouter();

  const displayAddress = property.formatted_address ?? property.address;
  const location = [property.suburb, property.city, property.postcode]
    .filter(Boolean)
    .join(", ");
  const keyAvailable = property.key_status === "available";

  return (
    <Pressable
      onPress={() => router.push(`/(app)/properties/${property.id}` as never)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      {/* Icon badge */}
      <View style={styles.iconBadge}>
        <Building2 size={20} color={theme.colors.primary} strokeWidth={1.8} />
      </View>

      {/* Text */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.address} numberOfLines={1}>
            {displayAddress}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <MapPin size={11} color={theme.colors.textLight} strokeWidth={1.8} />
          <Text style={styles.location} numberOfLines={1}>
            {location}
          </Text>
        </View>

        <View style={styles.badgeRow}>
          {/* Property type badge */}
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>
              {PROPERTY_TYPE_LABEL[property.property_type] ?? property.property_type}
            </Text>
          </View>

          {/* Key status indicator */}
          <View style={styles.keyRow}>
            <KeyRound
              size={11}
              color={keyAvailable ? theme.colors.success : theme.colors.warning}
              strokeWidth={2}
            />
            <Text
              style={[
                styles.keyLabel,
                { color: keyAvailable ? theme.colors.success : theme.colors.warning },
              ]}
            >
              {keyAvailable ? "Key available" : "With landlord"}
            </Text>
          </View>
        </View>
      </View>

      <ChevronRight size={18} color={theme.colors.textLight} strokeWidth={1.8} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
  },
  cardPressed: {
    backgroundColor: theme.colors.neutralSoft,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 4,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  address: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    flex: 1,
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
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginTop: 2,
  },
  typeBadge: {
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
  keyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  keyLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
});

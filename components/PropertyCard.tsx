import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Building2, ChevronRight, MapPin } from "lucide-react-native";

import type { Property } from "@/services/properties.service";
import { useFirstPropertyImageUrl } from "@/hooks/usePropertyImages";
import { PROPERTY_TYPE_LABEL } from "@/components/property/add/types";
import { theme } from "@/constants/theme";

type PropertyCardProps = {
  property: Property;
};

export function PropertyCard({ property }: PropertyCardProps) {
  const router = useRouter();
  const { data: imageUrl } = useFirstPropertyImageUrl(property.images ?? []);

  const location = [property.suburb, property.city, property.postcode]
    .filter(Boolean)
    .join(", ");

  const title = property.unit_number
    ? `${property.unit_number}/${property.address}`
    : property.address;

  return (
    <Pressable
      onPress={() => router.push(`/(app)/properties/${property.id}` as never)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      {/* Thumbnail — edge-to-edge left panel */}
      <View style={styles.thumbnail}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.thumbnailImage}
            resizeMode="cover"
          />
        ) : (
          <Building2 size={26} color={theme.colors.primary} strokeWidth={1.8} />
        )}
      </View>

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
  thumbnail: {
    width: 80,
    alignSelf: "stretch",
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  thumbnailImage: {
    width: 80,
    height: "100%",
  },
  content: {
    flex: 1,
    gap: 4,
    paddingVertical: theme.spacing.md,
    paddingLeft: theme.spacing.md,
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

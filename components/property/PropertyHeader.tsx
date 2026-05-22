import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Building2, MapPin } from "lucide-react-native";

import { theme } from "@/constants/theme";
import type { Property } from "@/services/properties.service";

import { PROPERTY_TYPE_LABEL } from "./propertyLabels";

export type PropertyHeaderProps = {
  property: Property;
};

export const PropertyHeader = memo(function PropertyHeader({ property }: PropertyHeaderProps) {
  const title = property.unit_number
    ? `${property.unit_number}/${property.address}`
    : property.address;

  const location = [property.suburb, property.city, property.postcode]
    .filter(Boolean)
    .join(", ");

  return (
    <View style={styles.header}>
      <View style={styles.top}>
        <View style={styles.iconWrap}>
          <Building2 size={24} color={theme.colors.primary} strokeWidth={1.8} />
        </View>

        <View style={styles.info}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>
              {PROPERTY_TYPE_LABEL[property.property_type] ?? property.property_type}
            </Text>
          </View>

          <Text style={styles.title}>{title}</Text>

          <View style={styles.locationRow}>
            <MapPin size={12} color={theme.colors.textLight} strokeWidth={1.8} />
            <Text style={styles.locationText}>{location}</Text>
          </View>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
  },
  top: {
    flexDirection: "row",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 4,
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
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.text,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  locationText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
});


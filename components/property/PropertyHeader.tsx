import { memo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Building2, MapPin, Pencil } from "lucide-react-native";

import { useRole } from "@/hooks";
import { theme, PROPERTY_TYPE_LABEL } from "@/constants";
import type { PropertyWithLandlord } from "@/lib/services";
import { PropertyEditSheet } from "./PropertyEditSheet";
import { Card, IconBadge, MetaRow, Pill } from "@/components/ui";

export type PropertyHeaderProps = {
  property: PropertyWithLandlord;
};

export const PropertyHeader = memo(function PropertyHeader({
  property,
}: PropertyHeaderProps) {
  const { isAdmin } = useRole();
  const [editOpen, setEditOpen] = useState(false);

  const title = property.unit_number
    ? `${property.unit_number}/${property.address}`
    : property.address;

  const location = [property.suburb, property.city, property.postcode]
    .filter(Boolean)
    .join(", ");

  const landlord = property.landlord;
  const showLandlord = Boolean(isAdmin && landlord);
  const landlordMeta = showLandlord && landlord
    ? [
        { label: "Landlord", value: landlord.full_name || "—" },
        ...(landlord.phone || landlord.email
          ? [{ label: "Contact", value: landlord.phone ?? landlord.email ?? "—" }]
          : []),
      ]
    : [];

  return (
    <Card flush>
      {/* ── Info row ──────────────────────────────────────────────────────── */}
      <View style={styles.top}>
        <IconBadge icon={Building2} tone="primary" size="lg" />

        <View style={styles.info}>
          <Pill tone="primary" size="sm">
            {PROPERTY_TYPE_LABEL[property.property_type] ??
              property.property_type}
          </Pill>

          <Text style={styles.title}>{title}</Text>

          <View style={styles.locationRow}>
            <MapPin size={12} color={theme.colors.textLight} strokeWidth={1.8} />
            <Text style={styles.locationText}>{location}</Text>
          </View>
        </View>

        {isAdmin ? (
          <Pressable
            onPress={() => setEditOpen(true)}
            style={({ pressed }) => [
              styles.editBtn,
              pressed && styles.editBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Edit property"
            hitSlop={8}
          >
            <Pencil size={16} color={theme.colors.primary} strokeWidth={1.9} />
          </Pressable>
        ) : null}
      </View>

      {/* ── Landlord meta ─────────────────────────────────────────────────── */}
      {landlordMeta.length > 0 ? (
        <View style={styles.metaWrap}>
          <MetaRow items={landlordMeta} />
        </View>
      ) : null}

      {/* ── Edit sheet ────────────────────────────────────────────────────── */}
      {isAdmin && (
        <PropertyEditSheet
          property={property}
          visible={editOpen}
          onClose={() => setEditOpen(false)}
        />
      )}
    </Card>
  );
});

const styles = StyleSheet.create({
  top: {
    flexDirection: "row",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  info: { flex: 1, gap: 4 },
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
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  editBtnPressed: {
    opacity: 0.6,
  },
  metaWrap: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
});

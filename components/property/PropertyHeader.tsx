import { memo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Building2, MapPin, Pencil, Users } from "lucide-react-native";

import { useRole } from "@/hooks";
import { theme, PROPERTY_TYPE_LABEL } from "@/constants";
import type { PropertyWithLandlord, TenantHolder } from "@/lib/services";
import { PropertyEditSheet } from "./PropertyEditSheet";
import { Card, IconBadge, MetaRow, Pill } from "@/components/ui";

export type PropertyHeaderProps = {
  property: PropertyWithLandlord;
  tenant?: TenantHolder;
  /** When true, the admin edit button is hidden (e.g. on the keyset detail screen). */
  hideEdit?: boolean;
};

export const PropertyHeader = memo(function PropertyHeader({
  property,
  tenant,
  hideEdit = false,
}: PropertyHeaderProps) {
  const { isAdmin } = useRole();
  const [editOpen, setEditOpen] = useState(false);

  const title = property.unit_number
    ? `${property.unit_number}/${property.address}`
    : property.address;

  const location = property.suburb || property.city || "";

  const landlord = property.landlord;
  const showLandlord = Boolean(isAdmin && landlord);
  const landlordMeta =
    showLandlord && landlord
      ? [
          { label: "Landlord", value: landlord.full_name || "—" },
          ...(landlord.phone || landlord.email
            ? [
                {
                  label: "Contact",
                  value: landlord.phone ?? landlord.email ?? "—",
                  phone: !!landlord.phone,
                },
              ]
            : []),
        ]
      : [];

  const showTenant = Boolean(isAdmin && tenant);
  const tenantMeta =
    showTenant && tenant
      ? [
          { label: "Tenant", value: tenant.full_name || "—" },
          ...(tenant.phone
            ? [{ label: "Contact", value: tenant.phone, phone: true }]
            : []),
        ]
      : [];

  return (
    <Card flush>
      {/* ── Info row ──────────────────────────────────────────────────────── */}
      <View style={styles.top}>
        <IconBadge icon={Building2} tone="accent" size="lg" />

        <View style={styles.info}>
          <Pill tone="accent" size="sm">
            {PROPERTY_TYPE_LABEL[property.property_type] ??
              property.property_type}
          </Pill>

          <Text style={styles.title}>{title}</Text>

          <View style={styles.locationRow}>
            <MapPin
              size={12}
              color={theme.colors.textLight}
              strokeWidth={1.8}
            />
            <Text style={styles.locationText}>{location}</Text>
          </View>
        </View>

        {isAdmin && !hideEdit ? (
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
            <Pencil size={16} color={theme.colors.accent} strokeWidth={1.9} />
          </Pressable>
        ) : null}
      </View>

      {/* ── Landlord meta ─────────────────────────────────────────────────── */}
      {landlordMeta.length > 0 ? (
        <View style={styles.metaWrap}>
          <MetaRow items={landlordMeta} />
        </View>
      ) : null}

      {/* ── Tenant meta ───────────────────────────────────────────────────── */}
      {tenantMeta.length > 0 ? (
        <View style={styles.tenantMetaWrap}>
          <View style={styles.tenantDivider} />
          <View style={styles.tenantHeader}>
            <Users size={11} color={theme.colors.primary} strokeWidth={2} />
            <Text style={styles.tenantLabel}>Current Tenant</Text>
          </View>
          <MetaRow items={tenantMeta} divider={false} />
        </View>
      ) : null}

      {/* ── Edit sheet ────────────────────────────────────────────────────── */}
      {isAdmin && !hideEdit && (
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
    backgroundColor: theme.colors.accentSoft,
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
  tenantMetaWrap: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.accentSoft,
    borderBottomLeftRadius: theme.radius.lg,
    borderBottomRightRadius: theme.radius.lg,
  },
  tenantDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  tenantHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  tenantLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
});

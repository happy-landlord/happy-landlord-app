import { memo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  Building2,
  MoreVertical,
  Pencil,
  Trash2,
  Users,
  ArrowDownToLine,
  PackageOpen,
} from "lucide-react-native";

import { useRole } from "@/hooks";
import { theme, PROPERTY_TYPE_LABEL } from "@/constants";
import type { TenantHolder } from "@/lib/services";
import { useProperty, usePropertyTenant } from "@/lib/hooks";
import { BottomSheet, Card, IconBadge, MetaRow } from "@/components/ui";
import { formatStreetLine } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PropertyHeaderCardActions = {
  onEdit: () => void;
  onDelete: () => void;
  onHandoverTenant: () => void;
  onHandoverLandlord: () => void;
  onCollect: () => void;
  onCollectFromLandlord: () => void;
};

export type PropertyHeaderCardProps = {
  propertyId: string;
  tenantOverride?: TenantHolder;
  /** When provided (admin), shows the ⋮ options button inside the card. */
  actions?: PropertyHeaderCardActions;
};

// ── Component ─────────────────────────────────────────────────────────────────

export const PropertyHeaderCard = memo<PropertyHeaderCardProps>(
  function PropertyHeaderCard({ propertyId, tenantOverride, actions }) {
    const { isAdmin } = useRole();
    const { data: property } = useProperty(propertyId);
    const [menuOpen, setMenuOpen] = useState(false);

    const { data: fetchedTenant } = usePropertyTenant(
      propertyId,
      isAdmin && property?.status === "leased" && tenantOverride === undefined,
    );

    const tenant: TenantHolder =
      tenantOverride !== undefined ? tenantOverride : (fetchedTenant ?? null);

    if (!property) return null;

    const suburb = property.suburb?.trim() || property.city?.trim() || "";
    const streetLine = formatStreetLine(property);
    const propTypeLabel =
      PROPERTY_TYPE_LABEL[property.property_type] ?? property.property_type;
    const subtitleText = [suburb, propTypeLabel].filter(Boolean).join(" · ");

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
            { label: "Current Tenant", value: tenant.full_name || "—" },
            ...(tenant.phone
              ? [{ label: "Contact", value: tenant.phone, phone: true }]
              : []),
          ]
        : [];

    const isLeased = property.status === "leased";
    const isInactive = property.status === "inactive";

    function pick(action: () => void) {
      setMenuOpen(false);
      setTimeout(action, 250);
    }

    return (
      <>
        <Card flush>
          {/* ── Info row ──────────────────────────────────────────────────── */}
          <View style={styles.top}>
            <IconBadge icon={Building2} tone="neutral" size="md" />

            <View style={styles.info}>
              <Text style={styles.street} numberOfLines={2}>
                {streetLine}
              </Text>
              {subtitleText ? (
                <Text style={styles.suburb} numberOfLines={1}>
                  {subtitleText}
                </Text>
              ) : null}
            </View>

            {actions ? (
              <Pressable
                style={({ pressed }) => [
                  styles.moreBtn,
                  pressed && styles.moreBtnPressed,
                ]}
                onPress={() => setMenuOpen(true)}
                accessibilityLabel="Property options"
                hitSlop={8}
              >
                <MoreVertical
                  size={20}
                  color={theme.colors.textLight}
                  strokeWidth={2}
                />
              </Pressable>
            ) : null}
          </View>

          {/* ── Landlord meta ──────────────────────────────────────────────── */}
          {landlordMeta.length > 0 ? (
            <View style={styles.metaWrap}>
              <MetaRow items={landlordMeta} />
            </View>
          ) : null}

          {/* ── Tenant meta ────────────────────────────────────────────────── */}
          {tenantMeta.length > 0 ? (
            <View style={styles.tenantMetaWrap}>
              <View style={styles.tenantDivider} />
              <MetaRow items={tenantMeta} divider={false} />
            </View>
          ) : null}
        </Card>

        {/* ── Options sheet ─────────────────────────────────────────────────── */}
        {actions ? (
          <BottomSheet visible={menuOpen} onClose={() => setMenuOpen(false)}>
            <Text style={styles.sheetTitle}>Property Options</Text>
            <View style={styles.menuItems}>
              {isLeased ? (
                <MenuItem
                  icon={<ArrowDownToLine size={18} color={theme.colors.text} strokeWidth={1.8} />}
                  label="Collect from Tenant"
                  onPress={() => pick(actions.onCollect)}
                />
              ) : isInactive ? (
                <MenuItem
                  icon={<PackageOpen size={18} color={theme.colors.text} strokeWidth={1.8} />}
                  label="Collect from Landlord"
                  onPress={() => pick(actions.onCollectFromLandlord)}
                />
              ) : (
                <>
                  <MenuItem
                    icon={<Users size={18} color={theme.colors.text} strokeWidth={1.8} />}
                    label="Handover to Tenant"
                    onPress={() => pick(actions.onHandoverTenant)}
                  />
                  <View style={styles.sep} />
                  <MenuItem
                    icon={<Building2 size={18} color={theme.colors.text} strokeWidth={1.8} />}
                    label="Handover to Landlord"
                    onPress={() => pick(actions.onHandoverLandlord)}
                  />
                </>
              )}
              <View style={styles.sep} />
              <MenuItem
                icon={<Pencil size={18} color={theme.colors.text} strokeWidth={1.8} />}
                label="Edit Property"
                onPress={() => pick(actions.onEdit)}
              />
              <View style={styles.sep} />
              <MenuItem
                icon={<Trash2 size={18} color={theme.colors.danger} strokeWidth={1.8} />}
                label="Delete Property"
                labelStyle={styles.dangerLabel}
                onPress={() => pick(actions.onDelete)}
              />
            </View>
          </BottomSheet>
        ) : null}
      </>
    );
  },
);

// ── MenuItem ──────────────────────────────────────────────────────────────────

function MenuItem({
  icon,
  label,
  labelStyle,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  labelStyle?: object;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
      onPress={onPress}
    >
      {icon}
      <Text style={[styles.menuItemLabel, labelStyle]}>{label}</Text>
    </Pressable>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  info: { flex: 1, gap: 2, minWidth: 0 },
  suburb: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  street: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.text,
    letterSpacing: -0.2,
  },
  moreBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  moreBtnPressed: {
    backgroundColor: theme.colors.neutralSoft,
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
  // Sheet
  sheetTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textLight,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: theme.spacing.sm,
  },
  menuItems: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
    backgroundColor: theme.colors.surfaceWarm,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  menuItemPressed: {
    backgroundColor: theme.colors.neutralSoft,
  },
  menuItemLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: theme.colors.text,
    flex: 1,
  },
  dangerLabel: {
    color: theme.colors.danger,
  },
  sep: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: theme.spacing.md + 18 + theme.spacing.md,
  },
});

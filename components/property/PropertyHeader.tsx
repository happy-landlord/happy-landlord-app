import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Building2 } from "lucide-react-native";

import { useRole } from "@/hooks";
import { theme, PROPERTY_TYPE_LABEL } from "@/constants";
import type { TenantHolder } from "@/lib/services";
import { useProperty, usePropertyTenant } from "@/lib/hooks";
import { Card, IconBadge, MetaRow, Pill } from "@/components/ui";
import { formatStreetLine } from "@/lib/utils";

export type PropertyHeaderProps = {
  /** Property to display — self-fetched internally via TanStack. */
  propertyId: string;
  /**
   * Explicit tenant override. When provided, skips the `usePropertyTenant`
   * query and uses this instead — used by the keyset detail screen where the
   * tenant is already known from the keyset's `current_holder`.
   */
  tenantOverride?: TenantHolder;
};

export const PropertyHeader = memo<PropertyHeaderProps>(
  function PropertyHeader({ propertyId, tenantOverride }) {
    const { isAdmin } = useRole();
    const { data: property } = useProperty(propertyId);
    // Only fetch tenant when: admin, property is leased, no override already provided.
    const { data: fetchedTenant } = usePropertyTenant(
      propertyId,
      isAdmin && property?.status === "leased" && tenantOverride === undefined,
    );

    // tenantOverride wins when provided (keyset screen); otherwise use the query.
    const tenant: TenantHolder =
      tenantOverride !== undefined ? tenantOverride : (fetchedTenant ?? null);

    if (!property) return null;

    const suburb = property.suburb?.trim() || property.city?.trim() || "";
    const streetLine = formatStreetLine(property);

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

    return (
      <Card flush>
        {/* ── Info row ──────────────────────────────────────────────────────── */}
        <View style={styles.top}>
          <IconBadge icon={Building2} tone="neutral" size="md" />

          <View style={styles.info}>
            {/* Row 1: suburb prefix + property-type badge */}
            <View style={styles.topRow}>
              <Text style={styles.suburb} numberOfLines={1}>
                {suburb}
              </Text>
              <Pill tone="accent" size="sm">
                {PROPERTY_TYPE_LABEL[property.property_type] ??
                  property.property_type}
              </Pill>
            </View>
            {/* Row 2: unit / street address */}
            <Text style={styles.street} numberOfLines={2}>
              {streetLine}
            </Text>
          </View>
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
            <MetaRow items={tenantMeta} divider={false} />
          </View>
        ) : null}

        {/* ── Edit sheet is managed by the parent screen ──────────────────── */}
      </Card>
    );
  },
);

const styles = StyleSheet.create({
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  info: { flex: 1, gap: 2, minWidth: 0 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  suburb: {
    flex: 1,
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

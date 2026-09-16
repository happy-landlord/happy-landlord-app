import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Building2 } from "lucide-react-native";

import { BottomSheet, IconBadge, PhoneLink } from "@/components/ui";
import { PROPERTY_TYPE_LABEL, theme } from "@/constants";
import { formatStreetLine } from "@/lib/utils";
import type { PropertyWithLandlord, TenantHolder } from "@/lib/services";

type Props = {
  property: PropertyWithLandlord;
  tenant: TenantHolder;
  showKeyholders: boolean;
  visible: boolean;
  onClose: () => void;
};

type Detail = {
  label: string;
  value: string;
  phone?: boolean;
  fullWidth?: boolean;
};

const STATUS_LABELS = {
  active: "Active",
  leased: "Leased",
  inactive: "Inactive",
  draft: "Draft",
} as const;

function optionalDetail(
  label: string,
  value: string | number | null | undefined,
  options?: Pick<Detail, "phone" | "fullWidth">,
): Detail | null {
  if (value === null || value === undefined) return null;
  const displayValue = String(value).trim();
  if (!displayValue) return null;
  return { label, value: displayValue, ...options };
}

function compact(details: (Detail | null)[]): Detail[] {
  return details.filter((detail): detail is Detail => detail !== null);
}

export function PropertyInfoSheet({
  property,
  tenant,
  showKeyholders,
  visible,
  onClose,
}: Props) {
  const fullAddress =
    property.formatted_address?.trim() ||
    [formatStreetLine(property), property.suburb, property.postcode]
      .filter(Boolean)
      .join(", ");

  const propertyDetails = compact([
    optionalDetail("Property Code", property.property_code),
    optionalDetail(
      "Type",
      PROPERTY_TYPE_LABEL[property.property_type] ?? property.property_type,
    ),
    optionalDetail("Status", STATUS_LABELS[property.status]),
    optionalDetail(
      "Rental Status",
      property.rental_status === "short"
        ? "Short Term"
        : property.rental_status === "long"
          ? "Long Term"
          : null,
    ),
    optionalDetail("Unit Number", property.unit_number),
  ]);

  const managementDetails = compact([
    optionalDetail("Lot Number", property.lot_number),
    optionalDetail("Developer", property.developer_name),
    optionalDetail("Consultant", property.consultant_name),
    optionalDetail("MAA Fee", property.maa_fee),
    optionalDetail("Cabinet Slot", property.cabinet_code),
  ]);

  const featureDetails = compact([
    optionalDetail("Bedrooms", property.bedrooms),
    optionalDetail("Bathrooms", property.bathrooms),
    optionalDetail("Carparks", property.carparks),
    optionalDetail("Parking Location", property.parking_location),
    optionalDetail("Storage Location", property.storage_location),
  ]);

  const noteDetails = compact([
    optionalDetail("Defects", property.defects, { fullWidth: true }),
    optionalDetail("Notes", property.notes, { fullWidth: true }),
  ]);

  const landlordNotes = property.landlord?.notes?.trim();
  const keysReceivedPrefix = "Keys received:";
  const contactDetails = showKeyholders
    ? compact([
        optionalDetail("Landlord", property.landlord?.full_name),
        optionalDetail("Landlord Contact", property.landlord?.phone, {
          phone: true,
        }),
        optionalDetail("Landlord Email", property.landlord?.email),
        optionalDetail(
          landlordNotes?.startsWith(keysReceivedPrefix)
            ? "Keys Received"
            : "Landlord Notes",
          landlordNotes?.startsWith(keysReceivedPrefix)
            ? landlordNotes.slice(keysReceivedPrefix.length).trim()
            : landlordNotes,
        ),
        optionalDetail("Current Tenant", tenant?.full_name),
        optionalDetail("Tenant Contact", tenant?.phone, { phone: true }),
      ])
    : [];

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      keyboardBehavior="none"
      containerStyle={styles.sheet}
    >
      <Text style={styles.sheetTitle}>Property Information</Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.addressCard}>
          <IconBadge icon={Building2} tone="neutral" size="md" />
          <View style={styles.addressContent}>
            {property.title?.trim() ? (
              <Text style={styles.propertyTitle}>{property.title.trim()}</Text>
            ) : null}
            <Text style={styles.address} numberOfLines={3}>
              {fullAddress}
            </Text>
          </View>
        </View>

        <DetailSection title="Property Details" details={propertyDetails} />
        <DetailSection
          title="Building & Management"
          details={managementDetails}
        />
        <DetailSection title="Property Features" details={featureDetails} />
        <DetailSection title="Property Notes" details={noteDetails} />
        <DetailSection title="Keyholders" details={contactDetails} />
      </ScrollView>
    </BottomSheet>
  );
}

function DetailSection({
  title,
  details,
}: {
  title: string;
  details: Detail[];
}) {
  if (details.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.detailGrid}>
        {details.map((detail) => (
          <DetailItem key={detail.label} detail={detail} />
        ))}
      </View>
    </View>
  );
}

function DetailItem({ detail }: { detail: Detail }) {
  let value: ReactNode = <Text style={styles.detailValue}>{detail.value}</Text>;
  if (detail.phone) {
    value = (
      <PhoneLink phone={detail.value} textStyle={styles.detailPhoneValue} />
    );
  }

  return (
    <View
      style={[styles.detailItem, detail.fullWidth && styles.detailItemFull]}
    >
      <Text style={styles.detailLabel}>{detail.label}</Text>
      {value}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    maxHeight: "88%",
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  scroll: {
    flexShrink: 1,
  },
  scrollContent: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceWarm,
  },
  addressContent: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  propertyTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  address: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
    lineHeight: 21,
  },
  section: {
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 2,
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  detailItem: {
    flexBasis: "46%",
    flexGrow: 1,
    gap: 3,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
  },
  detailItemFull: {
    flexBasis: "100%",
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
    lineHeight: 18,
  },
  detailPhoneValue: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.primary,
  },
});

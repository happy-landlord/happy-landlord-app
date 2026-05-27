import type { ComponentType, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Building2,
  KeyRound,
  User,
} from "lucide-react-native";

import { theme } from "@/constants/theme";
import { KEY_TYPE_ICON, KEY_TYPE_LABEL } from "@/components/key/keyLabels";
import { PROPERTY_TYPES, type KeyEntry, type PropertyStep } from "./types";

type IconComponent = ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

type Props = {
  propertyData: PropertyStep;
  keys: KeyEntry[];
};

export function ReviewStep({ propertyData, keys }: Props) {
  const selectedTypeLabel =
    PROPERTY_TYPES.find((t) => t.value === propertyData.propertyType)?.label ??
    "";

  const totalPhysicalKeys = keys.reduce((sum, key) => sum + key.count, 0);

  const descriptionParts =
    propertyData.selectedPlace?.description
      ?.split(",")
      .map((part) => part.trim())
      .filter(Boolean) ?? [];

  const addressPrimaryLine = propertyData.selectedPlace
    ? [
        propertyData.selectedPlace.streetNumber,
        propertyData.selectedPlace.street,
      ]
        .filter(Boolean)
        .join(" ") ||
      descriptionParts[0] ||
      "—"
    : "—";

  const addressSecondaryLine = propertyData.selectedPlace
    ? [
        propertyData.selectedPlace.suburb,
        propertyData.selectedPlace.state,
        propertyData.selectedPlace.postcode,
      ]
        .filter(Boolean)
        .join(", ") || descriptionParts.slice(1).join(", ")
    : "";

  return (
    <View style={styles.container}>
      <Text style={styles.subheading}>
        A final, easy-to-scan summary before creating the property.
      </Text>

      <View style={styles.overviewCard}>
        <View style={styles.overviewHeaderRow}>
          <View style={styles.propertyIconTile}>
            <Building2
              size={28}
              color={theme.colors.primary}
              strokeWidth={1.7}
            />
          </View>
          <View style={styles.overviewMain}>
            <Text style={styles.overviewLabel}>
              {selectedTypeLabel || "Property"}
            </Text>
            <Text style={styles.overviewTitle} numberOfLines={2}>
              {addressPrimaryLine}
            </Text>
            {addressSecondaryLine ? (
              <Text style={styles.overviewSubtitle} numberOfLines={2}>
                {addressSecondaryLine}
              </Text>
            ) : null}
          </View>
        </View>

        {(propertyData.landlordName || propertyData.landlordContact) ? (
          <>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewMetaRow}>
              <User size={13} color={theme.colors.textLight} strokeWidth={1.8} />
              <View style={styles.overviewMetaItem}>
                <Text style={styles.overviewMetaLabel}>Landlord</Text>
                <Text style={styles.overviewMetaValue} numberOfLines={1}>
                  {propertyData.landlordName || "—"}
                </Text>
              </View>
              {propertyData.landlordContact ? (
                <View style={[styles.overviewMetaItem, styles.overviewMetaItemBorder]}>
                  <Text style={styles.overviewMetaLabel}>Contact</Text>
                  <Text style={styles.overviewMetaValue} numberOfLines={1}>
                    {propertyData.landlordContact}
                  </Text>
                </View>
              ) : null}
            </View>
          </>
        ) : null}
      </View>

      <InfoSection
        title="Keys"
        icon={KeyRound}
        trailing={`${totalPhysicalKeys} ${totalPhysicalKeys === 1 ? "key" : "keys"}`}
      >
        {keys.length === 0 ? (
          <View style={styles.emptyKeyCard}>
            <KeyRound
              size={18}
              color={theme.colors.textLight}
              strokeWidth={1.8}
            />
            <Text style={styles.noKeys}>No keys added.</Text>
          </View>
        ) : (
          <View style={styles.keyPillGrid}>
            {keys.map((key) => {
              const KeyIcon = KEY_TYPE_ICON[key.type] ?? KeyRound;
              return (
                <View key={key.id} style={styles.keyPill}>
                  <KeyIcon size={15} color={theme.colors.primary} strokeWidth={1.8} />
                  <Text style={styles.keyPillLabel} numberOfLines={1}>
                    {KEY_TYPE_LABEL[key.type] ?? key.type}
                  </Text>
                  <Text style={styles.keyPillCount}>
                    × {key.count}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </InfoSection>
    </View>
  );
}

function InfoSection({
  title,
  icon: Icon,
  trailing,
  children,
}: {
  title: string;
  icon: IconComponent;
  trailing?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleWrap}>
          <View style={styles.sectionIconWrap}>
            <Icon size={17} color={theme.colors.primary} strokeWidth={1.9} />
          </View>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {trailing ? (
          <Text style={styles.sectionTrailing}>{trailing}</Text>
        ) : null}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  subheading: {
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  overviewCard: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.primarySoft,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.md,
  },
  overviewHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.md,
  },
  propertyIconTile: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  overviewMain: {
    flex: 1,
    gap: 3,
  },
  overviewLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.primary,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.text,
    lineHeight: 23,
  },
  overviewSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  overviewDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  overviewMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  overviewMetaItem: {
    flex: 1,
    gap: 2,
  },
  overviewMetaItemBorder: {
    paddingLeft: theme.spacing.sm,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
  },
  overviewMetaLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    lineHeight: 14,
  },
  overviewMetaValue: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
    lineHeight: 18,
  },
  section: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surface,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceWarm,
  },
  sectionTitleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: theme.colors.text,
  },
  sectionTrailing: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  sectionBody: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  emptyKeyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  noKeys: {
    fontSize: 14,
    color: theme.colors.textLight,
    fontWeight: "600",
  },
  keyPillGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  keyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 7,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  keyPillLabel: {
    maxWidth: 120,
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.text,
  },
  keyPillCount: {
    fontSize: 13,
    fontWeight: "900",
    color: theme.colors.primary,
  },
});

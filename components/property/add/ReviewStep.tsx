import type { ComponentType, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Building2,
  KeyRound,
  User,
} from "lucide-react-native";

import { theme, PROPERTY_TYPES } from "@/constants";
import { KEY_TYPE_ICON, KEY_TYPE_LABEL } from "@/components/key";
import type { KeyEntry, KeySetDraft, PropertyStep } from "./types";

function keyLabel(entry: KeyEntry): string {
  if (entry.type === "other" && entry.otherLabel) return entry.otherLabel;
  return KEY_TYPE_LABEL[entry.type] ?? entry.type;
}

type IconComponent = ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

type Props = {
  propertyData: PropertyStep;
  keys: KeyEntry[];
  keySets: KeySetDraft[];
};

export function ReviewStep({ propertyData, keys, keySets }: Props) {
  const selectedTypeLabel =
    PROPERTY_TYPES.find((t) => t.value === propertyData.propertyType)?.label ?? "";

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

  const allocatedCounts: Record<string, number> = {};
  for (const ks of keySets) {
    for (const keyId of ks.keyIds) {
      allocatedCounts[keyId] = (allocatedCounts[keyId] ?? 0) + 1;
    }
  }

  const unassignedKeys = keys
    .map((key) => ({
      key,
      quantity: Math.max(0, key.count - (allocatedCounts[key.id] ?? 0)),
    }))
    .filter(({ quantity }) => quantity > 0);

  return (
    <View style={styles.container}>
      <Text style={styles.subheading}>
        A final, easy-to-scan summary before creating the property.
      </Text>

      {/* Property overview card */}
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

      {/* Keysets summary */}
      <InfoSection
        title="Keysets"
        icon={KeyRound}
        trailing={`${keySets.length} set${keySets.length === 1 ? "" : "s"}`}
      >
        {keySets.length === 0 ? (
          <View style={styles.emptyKeyCard}>
            <KeyRound size={18} color={theme.colors.textLight} strokeWidth={1.8} />
            <Text style={styles.noKeys}>No keysets added.</Text>
          </View>
        ) : (
          <View style={styles.keySetList}>
            {keySets.map((ks, i) => {
              const ksKeys = keys.filter((k) => ks.keyIds.includes(k.id));
              return (
                <View key={ks.id} style={styles.keySetRow}>
                  <View style={styles.keySetRowTop}>
                    <Text style={styles.keySetIndex}>{i + 1}</Text>
                    <Text style={styles.keySetName} numberOfLines={1}>{ks.name}</Text>
                    {ks.photoUris.length > 0 && (
                      <Text style={styles.keySetPhotos}>
                        {ks.photoUris.length} photo{ks.photoUris.length === 1 ? "" : "s"}
                      </Text>
                    )}
                  </View>
                  {ksKeys.length > 0 && (
                    <View style={styles.keyRowsList}>
                      {ksKeys.map((key) => {
                        const KeyIcon = KEY_TYPE_ICON[key.type] ?? KeyRound;
                        return (
                          <View key={key.id} style={styles.keyRow}>
                            <View style={styles.keyRowIconCircle}>
                              <KeyIcon size={14} color={theme.colors.textMuted} strokeWidth={1.8} />
                            </View>
                            <Text style={styles.keyRowLabel} numberOfLines={1}>
                              {keyLabel(key)}
                            </Text>
                            {key.code ? (
                              <Text style={styles.keyRowCode} numberOfLines={1}>
                                {key.code}
                              </Text>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </InfoSection>

      {/* Unassigned keys */}
      {unassignedKeys.length > 0 && (
        <InfoSection
          title="Unassigned Keys"
          icon={KeyRound}
          trailing={`${unassignedKeys.reduce((sum, item) => sum + item.quantity, 0)} key${
            unassignedKeys.reduce((sum, item) => sum + item.quantity, 0) === 1 ? "" : "s"
          }`}
        >
          <View style={styles.unassignedList}>
            {unassignedKeys.map(({ key, quantity }) => {
              const KeyIcon = KEY_TYPE_ICON[key.type] ?? KeyRound;
              return (
                <View key={key.id} style={styles.unassignedRow}>
                  <View style={styles.unassignedIconCircle}>
                    <KeyIcon size={14} color={theme.colors.textMuted} strokeWidth={1.8} />
                  </View>
                  <Text style={styles.unassignedLabel} numberOfLines={1}>
                    {keyLabel(key)}
                  </Text>
                  {key.code ? (
                    <Text style={styles.unassignedCode} numberOfLines={1}>
                      {key.code}
                    </Text>
                  ) : null}
                  <View style={styles.qtyBadge}>
                    <Text style={styles.qtyBadgeText}>{quantity}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </InfoSection>
      )}
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

  keySetList: { gap: 6 },
  keySetRow: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  keySetRowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  keySetIndex: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.primarySoft,
    textAlign: "center",
    lineHeight: 20,
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.primary,
  },
  keySetName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text,
  },
  keySetPhotos: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  keyRowsList: { gap: 6 },
  keyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  keyRowIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.neutralSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  keyRowLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text,
  },
  keyRowCode: {
    maxWidth: 100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.neutralSoft,
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.textMuted,
  },

  // ── Unassigned keys ───────────────────────────────────────────────────────
  unassignedList: { gap: 8 },
  unassignedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  unassignedIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.neutralSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  unassignedLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text,
  },
  unassignedCode: {
    maxWidth: 100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.neutralSoft,
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.textMuted,
  },
  qtyBadge: {
    minWidth: 28,
    alignItems: "center",
    borderRadius: theme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: theme.colors.neutralSoft,
  },
  qtyBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.textMuted,
  },
});

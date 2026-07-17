import type { ComponentType, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Building2,
  KeyRound,
  User,
  HardHat, // eslint-disable-line @typescript-eslint/no-unused-vars
} from "lucide-react-native";

import { KEY_TYPE_ICON, PROPERTY_TYPES, theme } from "@/constants";
import {
  countAllocatedKeys,
  getDraftKeyLabel,
  getUnallocatedKeys,
} from "@/lib/utils";
import type {
  KeyEntry,
  KeySetDraft,
  PropertyStep,
} from "./useAddPropertyWizard";

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
    PROPERTY_TYPES.find((t) => t.value === propertyData.propertyType)?.label ??
    "";

  const descriptionParts =
    propertyData.selectedPlace?.description
      ?.split(",")
      .map((part) => part.trim())
      .filter(Boolean) ?? [];

  const addressPrimaryLine = propertyData.selectedPlace
    ? [
        propertyData.selectedPlace.unitNumber?.trim() || null,
        [
          propertyData.selectedPlace.streetNumber,
          propertyData.selectedPlace.street,
        ]
          .filter(Boolean)
          .join(" ") ||
          descriptionParts[0] ||
          null,
      ]
        .filter(Boolean)
        .join(" / ") || "—"
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

  const allocatedCounts = countAllocatedKeys(keySets);
  const unassignedKeys = getUnallocatedKeys(keys, allocatedCounts);

  return (
    <View style={styles.container}>
      <Text style={styles.subheading}>
        A final, easy-to-scan summary before creating the property.
      </Text>

      {/* Property overview card */}
      <View style={styles.overviewCard}>
        {propertyData.cabinetCode ? (
          <View style={styles.ribbon}>
            <Text style={styles.ribbonText}>{propertyData.cabinetCode}</Text>
          </View>
        ) : null}
        <View style={styles.overviewHeaderRow}>
          <View style={styles.propertyIconTile}>
            <Building2
              size={28}
              color={theme.colors.textMuted}
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

        {propertyData.landlordName || propertyData.landlordContact ? (
          <>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewMetaRow}>
              <User
                size={13}
                color={theme.colors.textLight}
                strokeWidth={1.8}
              />
              <View style={styles.overviewMetaItem}>
                <Text style={styles.overviewMetaLabel}>Landlord</Text>
                <Text style={styles.overviewMetaValue} numberOfLines={1}>
                  {propertyData.landlordName || "—"}
                </Text>
              </View>
              {propertyData.landlordContact ? (
                <View
                  style={[
                    styles.overviewMetaItem,
                    styles.overviewMetaItemBorder,
                  ]}
                >
                  <Text style={styles.overviewMetaLabel}>Contact</Text>
                  <Text style={styles.overviewMetaValue} numberOfLines={1}>
                    {propertyData.landlordContact}
                  </Text>
                </View>
              ) : null}
            </View>
          </>
        ) : null}

        {/* Developer row — hidden for now (cabinet slot shown as ribbon instead)
        {(propertyData.developerName || propertyData.cabinetCode) ? (
          <>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewMetaRow}>
              {propertyData.developerName ? (
                <>
                  <HardHat size={13} color={theme.colors.textLight} strokeWidth={1.8} />
                  <View style={styles.overviewMetaItem}>
                    <Text style={styles.overviewMetaLabel}>Developer</Text>
                    <Text style={styles.overviewMetaValue} numberOfLines={1}>
                      {propertyData.developerName}
                    </Text>
                  </View>
                </>
              ) : null}
              {propertyData.cabinetCode ? (
                <View style={[
                  styles.overviewMetaItem,
                  propertyData.developerName ? styles.overviewMetaItemBorder : undefined,
                ]}>
                  <Text style={styles.overviewMetaLabel}>Cabinet Slot</Text>
                  <Text style={styles.overviewMetaValue} numberOfLines={1}>
                    {propertyData.cabinetCode}
                  </Text>
                </View>
              ) : null}
            </View>
          </>
        ) : null}
        */}
      </View>

      {/* Keysets summary */}
      <InfoSection
        title="Keysets"
        icon={KeyRound}
        trailing={`${keySets.length} set${keySets.length === 1 ? "" : "s"}`}
      >
        {keySets.length === 0 ? (
          <View style={styles.emptyKeyCard}>
            <KeyRound
              size={18}
              color={theme.colors.textLight}
              strokeWidth={1.8}
            />
            <Text style={styles.noKeys}>No keysets added.</Text>
          </View>
        ) : (
          <View style={styles.keySetList}>
            {keySets.map((ks) => {
              const ksKeys = keys.filter((k) => ks.keyIds.includes(k.id));
              return (
                <View key={ks.id} style={styles.keySetRow}>
                  {ks.cabinetSlot ? (
                    <View style={styles.ribbon}>
                      <Text style={styles.ribbonText}>{ks.cabinetSlot}</Text>
                    </View>
                  ) : null}
                  <View style={styles.keySetRowTop}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.keySetName} numberOfLines={1}>
                        {ks.name}
                      </Text>
                    </View>
                    {ks.photoUris.length > 0 && (
                      <Text style={styles.keySetPhotos}>
                        {ks.photoUris.length} photo
                        {ks.photoUris.length === 1 ? "" : "s"}
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
                              <KeyIcon
                                size={14}
                                color={theme.colors.surface}
                                strokeWidth={1.8}
                              />
                            </View>
                            <Text style={styles.keyRowLabel} numberOfLines={1}>
                              {getDraftKeyLabel(key)}
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

      {/* Stored keys */}
      {unassignedKeys.length > 0 && (
        <InfoSection
          title="Stored Keys"
          icon={KeyRound}
          trailing={`${unassignedKeys.reduce((sum, item) => sum + item.quantity, 0)} key${
            unassignedKeys.reduce((sum, item) => sum + item.quantity, 0) === 1
              ? ""
              : "s"
          }`}
        >
          <View style={styles.unassignedList}>
            {unassignedKeys.map(({ key, quantity }) => {
              const KeyIcon = KEY_TYPE_ICON[key.type] ?? KeyRound;
              return (
                <View key={key.id} style={styles.unassignedRow}>
                  <View style={styles.unassignedIconCircle}>
                    <KeyIcon
                      size={14}
                      color={theme.colors.surface}
                      strokeWidth={1.8}
                    />
                  </View>
                  <Text style={styles.unassignedLabel} numberOfLines={1}>
                    {getDraftKeyLabel(key)}
                  </Text>
                  {key.code ? (
                    <Text style={styles.unassignedCode} numberOfLines={1}>
                      {key.code}
                    </Text>
                  ) : null}
                  {quantity > 1 && (
                    <View style={styles.storageQtyBadge}>
                      <Text style={styles.storageQtyBadgeText}>{quantity}</Text>
                    </View>
                  )}
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
            <Icon size={17} color={theme.colors.textMuted} strokeWidth={1.9} />
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
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.md,
    overflow: "hidden",
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
    backgroundColor: theme.colors.neutralSoft,
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
    color: theme.colors.textMuted,
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
    backgroundColor: theme.colors.neutralSoft,
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
    overflow: "hidden",
  },
  ribbon: {
    position: "absolute",
    top: 10,
    right: -26,
    width: 96,
    backgroundColor: theme.colors.accent,
    transform: [{ rotate: "45deg" }],
    alignItems: "center",
    paddingVertical: 4,
    zIndex: 1,
  },
  ribbonText: {
    fontSize: 9,
    fontWeight: "800",
    color: theme.colors.surface,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  keySetRowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
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
    borderColor: theme.colors.accentLight,
    backgroundColor: theme.colors.surface,
  },
  keyRowIconCircle: {
    width: 28,
    height: 28,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accent,
    borderWidth: 1,
    borderColor: theme.colors.accent,
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

  // ── Storage keys ──────────────────────────────────────────────────────────
  unassignedList: { gap: 8 },
  unassignedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.accentLight,
    backgroundColor: theme.colors.neutralSoft,
  },
  unassignedIconCircle: {
    width: 28,
    height: 28,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accent,
    borderWidth: 1,
    borderColor: theme.colors.accent,
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
  storageQtyBadge: {
    minWidth: 28,
    alignItems: "center",
    borderRadius: theme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.accentLight,
  },
  storageQtyBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.accent,
  },
});

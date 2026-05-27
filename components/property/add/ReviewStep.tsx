import type { ComponentType, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Briefcase,
  Building2,
  KeyRound,
  Package,
  User,
} from "lucide-react-native";

import { theme } from "@/constants/theme";
import { KEY_TYPE_ICON, KEY_TYPE_LABEL } from "@/components/key/keyLabels";
import { PROPERTY_TYPES, type KeySetDraft, type PropertyStep } from "./types";

type IconComponent = ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

const SET_TYPE_META: Record<
  KeySetDraft["setType"],
  { label: string; Icon: IconComponent; color: string; bg: string }
> = {
  tenant: {
    label: "Tenant",
    Icon: User,
    color: theme.colors.info,
    bg: theme.colors.infoSoft,
  },
  company: {
    label: "Company",
    Icon: Briefcase,
    color: theme.colors.primary,
    bg: theme.colors.primarySoft,
  },
  unused: {
    label: "Utility",
    Icon: Package,
    color: theme.colors.warning,
    bg: theme.colors.warningSoft,
  },
};

type Props = {
  propertyData: PropertyStep;
  keySets: KeySetDraft[];
};

export function ReviewStep({ propertyData, keySets }: Props) {
  const selectedTypeLabel =
    PROPERTY_TYPES.find((t) => t.value === propertyData.propertyType)?.label ??
    "";

  const totalPhysicalKeys = keySets.reduce(
    (sum, set) => sum + set.keys.reduce((keySum, key) => keySum + key.count, 0),
    0,
  );

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
        title="Key sets"
        icon={KeyRound}
        trailing={`${totalPhysicalKeys} ${totalPhysicalKeys === 1 ? "key" : "keys"}`}
      >
        {keySets.length === 0 ? (
          <View style={styles.emptyKeySetCard}>
            <KeyRound
              size={18}
              color={theme.colors.textLight}
              strokeWidth={1.8}
            />
            <Text style={styles.noSets}>No key sets added.</Text>
          </View>
        ) : (
          <View style={styles.keySetList}>
            {keySets.map((ks, idx) => (
              <KeySetReviewCard key={ks.id} keySet={ks} index={idx} />
            ))}
          </View>
        )}
        {/* TODO: show master-set and per-keyset photo thumbnails here */}
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

function KeySetReviewCard({
  keySet,
  index,
}: {
  keySet: KeySetDraft;
  index: number;
}) {
  const meta = SET_TYPE_META[keySet.setType];
  const totalKeys = keySet.keys.reduce((sum, key) => sum + key.count, 0);
  const Icon = meta.Icon;

  return (
    <View style={[styles.setCard, { borderColor: `${meta.color}44` }]}>
      <View style={[styles.setAccent, { backgroundColor: meta.color }]} />
      <View style={styles.setContent}>
        <View style={styles.setHeader}>
          <View style={styles.setTitleWrap}>
            <View style={[styles.setIconWrap, { backgroundColor: meta.bg }]}>
              <Icon size={18} color={meta.color} strokeWidth={1.9} />
            </View>
            <View style={styles.setTitleTextWrap}>
              <Text style={[styles.setEyebrow, { color: meta.color }]}>
                Set {index + 1}
              </Text>
              <Text style={styles.setTitle}>{keySet.label || meta.label}</Text>
            </View>
          </View>
          <View style={[styles.keyCountBadge, { backgroundColor: meta.bg }]}>
            <KeyRound size={13} color={meta.color} strokeWidth={2} />
            <Text style={[styles.keyCountText, { color: meta.color }]}>
              {totalKeys} {totalKeys === 1 ? "key" : "keys"}
            </Text>
          </View>
        </View>

        {keySet.setType === "tenant" &&
        (keySet.tenantName || keySet.tenantContact) ? (
          <View style={[styles.tenantPanel, { backgroundColor: meta.bg }]}>
            {keySet.tenantName ? (
              <Text style={[styles.tenantText, { color: meta.color }]}>
                Tenant:{" "}
                <Text style={styles.tenantTextStrong}>{keySet.tenantName}</Text>
              </Text>
            ) : null}
            {keySet.tenantContact ? (
              <Text style={[styles.tenantText, { color: meta.color }]}>
                Contact:{" "}
                <Text style={styles.tenantTextStrong}>
                  {keySet.tenantContact}
                </Text>
              </Text>
            ) : null}
          </View>
        ) : null}

        {keySet.keys.length > 0 ? (
          <View style={styles.keyPillGrid}>
            {keySet.keys.map((key) => {
              const KeyIcon = KEY_TYPE_ICON[key.type] ?? KeyRound;
              return (
                <View key={key.id} style={styles.keyPill}>
                  <KeyIcon size={15} color={meta.color} strokeWidth={1.8} />
                  <Text style={styles.keyPillLabel} numberOfLines={1}>
                    {KEY_TYPE_LABEL[key.type] ?? key.type}
                  </Text>
                  <Text style={[styles.keyPillCount, { color: meta.color }]}>
                    × {key.count}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.emptyKeyText}>No keys added to this set.</Text>
        )}

        {keySet.notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{keySet.notes}</Text>
          </View>
        ) : null}
      </View>
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
  keySetList: {
    gap: theme.spacing.md,
  },
  setCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background,
    overflow: "hidden",
  },
  setAccent: {
    width: 5,
  },
  setContent: {
    flex: 1,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  setHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  setTitleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  setIconWrap: {
    width: 38,
    height: 38,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  setTitleTextWrap: {
    flex: 1,
  },
  setEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  setTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: theme.colors.text,
  },
  keyCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
  },
  keyCountText: {
    fontSize: 12,
    fontWeight: "800",
  },
  tenantPanel: {
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    gap: 3,
  },
  tenantText: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  tenantTextStrong: {
    color: theme.colors.text,
    fontWeight: "800",
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
  },
  emptyKeySetCard: {
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
  noSets: {
    fontSize: 14,
    color: theme.colors.textLight,
    fontWeight: "600",
  },
  emptyKeyText: {
    fontSize: 13,
    color: theme.colors.textLight,
    fontStyle: "italic",
  },
  notesBox: {
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 3,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.textLight,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  notesText: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textMuted,
  },
});

import { StyleSheet, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyRound, MapPin, Building2, User, Phone, Calendar, FileText, Hash, Mail, Nfc, Radio, CreditCard, AppWindow, Layers, Key } from "lucide-react-native";

import { useProperty } from "@/hooks/useProperties";
import { useKeySets } from "@/hooks/useKeySets";
import { useRole } from "@/hooks/useRole";
import { RoleGate } from "@/components/RoleGate";
import { KeyStatusChip, SET_TYPE_LABEL } from "@/components/KeyStatusChip";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import type { KeySet, KeyItemType } from "@/services/keys.service";
import type { Property } from "@/services/properties.service";
import { theme } from "@/constants/theme";

// ── Constants ─────────────────────────────────────────────────────────────────

const PROPERTY_TYPE_LABEL: Record<string, string> = {
  house: "House",
  townhouse: "Townhouse",
  apartment: "Apartment",
  unit: "Unit",
  duplex: "Duplex",
  villa: "Villa",
  other: "Other",
};

const ITEM_TYPE_LABEL: Record<KeyItemType, string> = {
  main_door: "Door",
  mailbox: "Mailbox",
  swipe_fob: "Fob",
  garage_remote: "Remote",
  key_card: "Card",
  window: "Window",
  balcony: "Balcony",
};

type IconComponent = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

const ITEM_TYPE_ICON: Record<KeyItemType, IconComponent> = {
  main_door:     Key,
  mailbox:       Mail,
  swipe_fob:     Nfc,
  garage_remote: Radio,
  key_card:      CreditCard,
  window:        AppWindow,
  balcony:       Layers,
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>{icon}</View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value ?? "—"}</Text>
      </View>
    </View>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function CardDivider() {
  return <View style={styles.cardDivider} />;
}

function KeySetCard({ keySet }: { keySet: KeySet }) {
  const items = keySet.inventory?.items ?? [];

  return (
    <View style={styles.keyCard}>
      <View style={styles.keyCardHeader}>
        <View style={styles.keyIcon}>
          <KeyRound size={18} color={theme.colors.primary} strokeWidth={1.8} />
        </View>

        <View style={styles.keyHeaderInfo}>
          <Text style={styles.keyCode}>{keySet.set_code}</Text>
          <Text style={styles.keyType}>
            {SET_TYPE_LABEL[keySet.set_type] ?? keySet.set_type}
          </Text>
        </View>

        <KeyStatusChip status={keySet.status} />
      </View>

      {items.length > 0 ? (
        <View style={styles.inventoryRow}>
          {items.map((item, index) => {
            const label = ITEM_TYPE_LABEL[item.type] ?? item.type;
            const Icon = ITEM_TYPE_ICON[item.type] ?? KeyRound;
            return (
              <View key={`${item.type}-${item.code}-${index}`} style={styles.inventoryChip}>
                <View style={styles.inventoryHeader}>
                  <View style={styles.inventoryIconCircle}>
                    <Icon size={13} color={theme.colors.primary} strokeWidth={1.8} />
                  </View>
                  <View style={styles.inventoryTextBlock}>
                    <Text style={styles.inventoryLabel} numberOfLines={1}>
                      {label}
                    </Text>
                    {item.code ? (
                      <View style={styles.inventoryCodeChip}>
                        <Text style={styles.inventoryCodeText}>{item.code}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.inventoryBadgeText}>x{item.quantity}</Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={styles.emptyInventoryText}>No inventory recorded.</Text>
      )}

      {keySet.notes ? (
        <View style={styles.keyNotesBox}>
          <Text style={styles.keyNotesLabel}>Notes</Text>
          <Text style={styles.keyNotes}>{keySet.notes}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ── Admin-only property sections ──────────────────────────────────────────────

function LandlordCard({ property }: { property: Property }) {
  const hasReturnInfo =
    property.key_status === "landlord" && property.landlord_key_delivery_date;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Landlord</Text>
      <SectionCard>
        <InfoRow
          icon={<User size={15} color={theme.colors.primary} strokeWidth={1.8} />}
          label="Name"
          value={property.landlord_name}
        />
        <CardDivider />
        <InfoRow
          icon={<Phone size={15} color={theme.colors.primary} strokeWidth={1.8} />}
          label="Contact"
          value={property.landlord_contact}
        />
        {hasReturnInfo && (
          <>
            <CardDivider />
            <InfoRow
              icon={<Calendar size={15} color={theme.colors.primary} strokeWidth={1.8} />}
              label="Keys returned"
              value={formatDate(property.landlord_key_delivery_date)}
            />
            {property.landlord_key_delivery_note && (
              <>
                <CardDivider />
                <InfoRow
                  icon={<FileText size={15} color={theme.colors.primary} strokeWidth={1.8} />}
                  label="Return note"
                  value={property.landlord_key_delivery_note}
                />
              </>
            )}
          </>
        )}
      </SectionCard>
    </View>
  );
}


// ── Screen ────────────────────────────────────────────────────────────────────

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { isAdmin } = useRole();

  const {
    data: property,
    isLoading: propLoading,
    isError: propError,
    refetch: refetchProp,
  } = useProperty(id);

  const {
    data: keySets,
    isLoading: keysLoading,
    isError: keysError,
    refetch: refetchKeys,
  } = useKeySets(id, { setType: isAdmin ? undefined : "company" });

  if (propLoading) return <LoadingState message="Loading property…" />;
  if (propError || !property)
    return (
      <ErrorState
        title="Property not found"
        message="Could not load this property."
        onRetry={refetchProp}
      />
    );

  const title = property.unit_number
    ? `${property.unit_number}/${property.address}`
    : property.address;

  const location = [property.suburb, property.city, property.postcode]
    .filter(Boolean)
    .join(", ");

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + theme.spacing.xl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Property header (both roles) ───────────────────────────────── */}
      <View style={styles.header}>
        {/* Top row: icon + address block */}
        <View style={styles.headerTop}>
          <View style={styles.headerIcon}>
            <Building2 size={24} color={theme.colors.primary} strokeWidth={1.8} />
          </View>
          <View style={styles.headerInfo}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>
                {PROPERTY_TYPE_LABEL[property.property_type] ?? property.property_type}
              </Text>
            </View>
            <Text style={styles.propertyTitle}>{title}</Text>
            <View style={styles.locationRow}>
              <MapPin size={12} color={theme.colors.textLight} strokeWidth={1.8} />
              <Text style={styles.locationText}>{location}</Text>
            </View>
          </View>
        </View>

        {/* Admin-only detail rows inside the same card */}
        <RoleGate allow="admin">
          <View style={styles.headerDivider} />
          <View style={styles.headerDetailRow}>
            <Hash size={13} color={theme.colors.textLight} strokeWidth={1.8} />
            <Text style={styles.headerDetailLabel}>Property code</Text>
            <Text style={styles.headerDetailValue}>{property.property_code}</Text>
          </View>
          <View style={styles.headerDetailRow}>
            <Calendar size={13} color={theme.colors.textLight} strokeWidth={1.8} />
            <Text style={styles.headerDetailLabel}>Added</Text>
            <Text style={styles.headerDetailValue}>{formatDate(property.created_at)}</Text>
          </View>
          <View style={styles.headerDetailRow}>
            <Calendar size={13} color={theme.colors.textLight} strokeWidth={1.8} />
            <Text style={styles.headerDetailLabel}>Last updated</Text>
            <Text style={styles.headerDetailValue}>{formatDate(property.updated_at)}</Text>
          </View>
        </RoleGate>
      </View>

      {/* ── Key sets (role-filtered) ───────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {isAdmin ? "Key Sets" : "Company Keys"}
        </Text>
        {keysError ? (
          <ErrorState
            title="Couldn't load key sets"
            message="Check your connection and try again."
            onRetry={refetchKeys}
          />
        ) : keysLoading ? (
          <LoadingState message="Loading key sets…" />
        ) : !keySets || keySets.length === 0 ? (
          <EmptyState
            title="No key sets"
            message={
              isAdmin
                ? "No key sets have been added for this property."
                : "No company key sets found for this property."
            }
          />
        ) : (
          <View style={styles.keyCardList}>
            {keySets.map((ks) => (
              <KeySetCard key={ks.id} keySet={ks} />
            ))}
          </View>
        )}
      </View>

      {/* ── Landlord info (admin only) ─────────────────────────────────── */}
      <RoleGate allow="admin">
        <LandlordCard property={property} />
      </RoleGate>
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.screen,
    gap: theme.spacing.md,
  },

  // ── Property header ──────────────────────────────────────────────────────
  header: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
  },
  headerTop: {
    flexDirection: "row",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: {
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
  propertyTitle: {
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
  headerDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  headerDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 1,
    borderTopWidth: 0,
  },
  headerDetailLabel: {
    fontSize: 13,
    color: theme.colors.textMuted,
    flex: 1,
  },
  headerDetailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
  },

  // ── Sections ────────────────────────────────────────────────────────────
  section: {
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingLeft: 2,
  },

  // ── Info card (landlord / audit) ─────────────────────────────────────────
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
  },
  cardDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: theme.spacing.md + 34 + theme.spacing.sm,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2,
  },
  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  infoContent: {
    flex: 1,
    gap: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: theme.colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.text,
  },

  // ── Key cards ───────────────────────────────────────────────────────────
  keyCardList: {
    gap: theme.spacing.sm,
  },
  keyCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  keyCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  keyIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  keyHeaderInfo: {
    flex: 1,
    gap: 2,
  },
  keyCode: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text,
  },
  keyType: {
    fontSize: 12,
    color: theme.colors.textLight,
    fontWeight: "500",
  },
  inventoryRow: {
    flexDirection: "column",
    gap: 6,
  },
  inventoryChip: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
  },
  inventoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
  },
  inventoryIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  inventoryTextBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inventoryLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text,
  },
  inventoryCode: {},
  inventoryBadge: {},
  inventoryBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  inventoryDetails: {},
  inventoryCodeChip: {
    backgroundColor: theme.colors.surfaceWarm,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  inventoryCodeText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
  },
  emptyInventoryText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontStyle: "italic",
  },
  keyNotesBox: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
    gap: 2,
  },
  keyNotesLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  keyNotes: {
    fontSize: 12,
    color: theme.colors.textLight,
    fontStyle: "italic",
  },
});

import { memo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Calendar, FileText, Phone, ArrowRightLeft, User } from "lucide-react-native";

import { theme } from "@/constants/theme";
import { formatDate } from "@/lib/format";
import type { Property } from "@/services/properties.service";

export type LandlordCardProps = {
  property: Property;
};

export const LandlordCard = memo(function LandlordCard({ property }: LandlordCardProps) {
  const hasReturnInfo =
    property.key_status === "landlord" && Boolean(property.landlord_key_delivery_date);
  const landlordName = property.landlord_name ?? "Landlord not recorded";
  const landlordContact = property.landlord_contact ?? "No contact recorded";

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Landlord</Text>
      <View style={styles.card}>
        <View style={styles.heroRow}>
          <View style={styles.avatar}>
            <User size={22} color={theme.colors.primary} strokeWidth={1.8} />
          </View>

          <View style={styles.heroInfo}>
            {hasReturnInfo && (
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>Keys handed over</Text>
              </View>
            )}
            <Text style={styles.landlordName}>{landlordName}</Text>
            <View style={styles.contactLine}>
              <Phone size={13} color={theme.colors.textLight} strokeWidth={1.8} />
              <Text style={styles.contactText}>{landlordContact}</Text>
            </View>
          </View>
        </View>

        {hasReturnInfo ? (
          <View style={styles.infoPanel}>
            <Row
              icon={<Calendar size={15} color={theme.colors.primary} strokeWidth={1.8} />}
              label="Keys returned"
              value={formatDate(property.landlord_key_delivery_date)}
            />
            {property.landlord_key_delivery_note ? (
              <>
                <PanelDivider />
                <Row
                  icon={<FileText size={15} color={theme.colors.primary} strokeWidth={1.8} />}
                  label="Return note"
                  value={property.landlord_key_delivery_note}
                />
              </>
            ) : null}
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [styles.handoverBtn, pressed && styles.handoverBtnPressed]}
          onPress={() => {}}
          accessibilityRole="button"
          accessibilityLabel="Handover keys to landlord"
        >
          <ArrowRightLeft size={16} color={theme.colors.textInverse} strokeWidth={2} />
          <Text style={styles.handoverBtnLabel}>Handover to Landlord</Text>
        </Pressable>
      </View>
    </View>
  );
});

// ─── Sub-components ────────────────────────────────────────────────────────

function Row({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>{icon}</View>
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value ?? "—"}</Text>
      </View>
    </View>
  );
}

function PanelDivider() {
  return <View style={styles.panelDivider} />;
}

const styles = StyleSheet.create({
  section: {
    gap: theme.spacing.sm,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingLeft: 2,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  heroRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  heroInfo: {
    flex: 1,
    gap: 4,
  },
  statusPill: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  landlordName: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.text,
  },
  contactLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  contactText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.textMuted,
  },
  infoPanel: {
    backgroundColor: theme.colors.surfaceWarm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
    color: theme.colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  value: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.text,
  },
  panelDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: theme.spacing.md + 34 + theme.spacing.sm,
  },
  handoverBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: 13,
    paddingHorizontal: theme.spacing.md,
  },
  handoverBtnPressed: {
    opacity: 0.75,
  },
  handoverBtnLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});

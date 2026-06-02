import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { AlertTriangle, Camera, KeyRound, Pencil } from "lucide-react-native";

import { KeyStatusChip } from "@/components/KeyStatusChip";
import { ReservationStatusChip } from "./ReservationStatusChip";
import { useKeySetScreen } from "./KeySetScreenContext";
import { theme } from "@/constants";
import { useCurrentUserId, useFirstKeySetImageUrl, useKeySet } from "@/lib/hooks";
import { useKeysetAvailability, useRole } from "@/hooks";
import { getTotalKeyQuantity, isPastDue } from "@/lib/utils";

// ── KeySetIdentityCard ───────────────────────────────────────────────────────
// Hero card on the keyset detail screen. Self-sufficient: pulls `keySet`,
// `currentUserId`, role, availability, and its banner image from hooks —
// the parent screen only needs to mount it inside `<KeySetScreenProvider>`.

export function KeySetIdentityCard() {
  const { keySetId, openModal } = useKeySetScreen();
  const { data: keySet } = useKeySet(keySetId);
  const currentUserId = useCurrentUserId();
  const { isAdmin } = useRole();
  const availability = useKeysetAvailability(keySetId);
  const { data: imageUrl } = useFirstKeySetImageUrl(keySet?.images);

  if (!keySet) return null;

  const status = keySet.status;
  const holderProfileId = keySet.current_holder?.profile_id;
  const isCheckedOut = status === "checked_out" || status === "overdue";
  const isHeldByMe = isCheckedOut && holderProfileId === currentUserId;
  const isHeldByOther = isCheckedOut && holderProfileId !== currentUserId;
  const isAvailable = status === "available";
  const overdue =
    status === "overdue" ||
    (keySet.due_back_at ? isPastDue(keySet.due_back_at) : false);

  const totalKeys = getTotalKeyQuantity(keySet);
  const holderName = keySet.current_holder?.full_name;
  const holderType = keySet.current_holder?.holder_type;
  const holderPhone = keySet.current_holder?.phone;
  const showHolderMeta = !!keySet.current_holder && isHeldByOther;

  return (
    <View style={styles.wrap}>
      {/* Overdue banner */}
      {overdue && (
        <View style={styles.overdueBanner}>
          <AlertTriangle size={16} color="#fff" strokeWidth={2} />
          <Text style={styles.overdueBannerText}>This keyset is overdue</Text>
        </View>
      )}

      <View style={[styles.card, overdue && styles.cardOverdue]}>
        {/* Image banner */}
        {imageUrl ? (
          <View style={styles.banner}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.bannerImage}
              resizeMode="cover"
            />
            <View style={styles.bannerBadge}>
              <Camera size={12} color="#fff" strokeWidth={2} />
            </View>
          </View>
        ) : null}

        {/* Top info row */}
        <View style={styles.top}>
          <View
            style={[
              styles.iconWrap,
              overdue
                ? styles.iconOverdue
                : isAvailable
                  ? styles.iconAvailable
                  : styles.iconOut,
            ]}
          >
            <KeyRound
              size={22}
              color={
                overdue
                  ? theme.colors.danger
                  : isAvailable
                    ? theme.colors.success
                    : theme.colors.warning
              }
              strokeWidth={1.8}
            />
          </View>

          <View style={styles.info}>
            <View style={styles.statusRow}>
              {isAdmin && <KeyStatusChip status={keySet.status} />}
              {!isAdmin && availability && (
                <ReservationStatusChip availability={availability} />
              )}
              <View style={styles.countPill}>
                <Text style={styles.countText}>
                  {totalKeys} {totalKeys === 1 ? "key" : "keys"}
                </Text>
              </View>
            </View>
            <Text style={styles.name}>{keySet.name}</Text>
            {isAdmin ? (
              <Text style={styles.code}>{keySet.code}</Text>
            ) : null}
          </View>

          {isAdmin && (
            <Pressable
              onPress={() => openModal({ kind: "editKeys" })}
              style={({ pressed }) => [
                styles.editBtn,
                pressed && styles.editBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Edit keys"
              hitSlop={8}
            >
              <Pencil size={16} color={theme.colors.primary} strokeWidth={1.9} />
            </Pressable>
          )}
        </View>

        {/* Holder meta — only shown when held by someone else */}
        {showHolderMeta && (
          <View style={styles.meta}>
            <View style={styles.metaDivider} />
            <View style={styles.metaContent}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>With</Text>
                <Text
                  style={[
                    styles.metaValue,
                    overdue && styles.metaValueDanger,
                  ]}
                  numberOfLines={1}
                >
                  {isHeldByMe ? "You" : (holderName ?? "Unknown")}
                  {holderType && holderType !== "agent"
                    ? ` · ${holderType}`
                    : ""}
                </Text>
              </View>

              {holderPhone && (
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Contact</Text>
                  <Text
                    style={[
                      styles.metaValue,
                      overdue && styles.metaValueDanger,
                    ]}
                    numberOfLines={1}
                  >
                    {holderPhone}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.md },

  overdueBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.danger,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  overdueBannerText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
    flex: 1,
  },

  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
  },
  cardOverdue: { borderColor: theme.colors.danger },

  banner: { width: "100%", height: 160 },
  bannerImage: { width: "100%", height: "100%" },
  bannerBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: theme.radius.pill,
    padding: 6,
  },

  top: {
    flexDirection: "row",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconAvailable: { backgroundColor: theme.colors.successSoft },
  iconOut: { backgroundColor: theme.colors.warningSoft },
  iconOverdue: { backgroundColor: theme.colors.dangerSoft },

  info: { flex: 1, gap: 4 },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  countPill: {
    minHeight: 20,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: theme.colors.neutralSoft,
  },
  countText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  name: { fontSize: 17, fontWeight: "700", color: theme.colors.text },
  code: { fontSize: 13, color: theme.colors.textMuted },

  editBtn: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  editBtnPressed: { opacity: 0.6 },

  meta: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  metaDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  metaContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  metaItem: { flex: 1, gap: 2 },
  metaLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
  },
  metaValueDanger: { color: theme.colors.danger },
});

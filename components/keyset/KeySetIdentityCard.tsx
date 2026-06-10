import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Camera, KeyRound } from "lucide-react-native";

import { KeyStatusChip } from "@/components/KeyStatusChip";
import { PhoneLink, Pill, ShareQrButton } from "@/components/ui";
import { ReservationStatusChip } from "./ReservationStatusChip";
import { KeySetKeysList } from "./KeySetKeysList";
import { useKeySetScreen } from "./KeySetScreenContext";
import { theme } from "@/constants";
import {
  useCurrentUserId,
  useFirstKeySetImageUrl,
  useKeySet,
} from "@/lib/hooks";
import { useRole } from "@/hooks";
import { useKeysetAvailability } from "./useKeysetAvailability";
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
  const isMissingDamaged = status === "missing_damaged";
  const overdue =
    status === "overdue" ||
    (status === "checked_out" && keySet.due_back_at
      ? isPastDue(keySet.due_back_at)
      : false);

  const totalKeys = getTotalKeyQuantity(keySet);
  const holderName = keySet.current_holder?.full_name;
  const holderType = keySet.current_holder?.holder_type;
  const holderPhone = keySet.current_holder?.phone;
  const showHolderMeta = !!keySet.current_holder && isHeldByOther;

  return (
    <View style={styles.wrap}>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          isAdmin && pressed && styles.cardPressed,
        ]}
        onPress={isAdmin ? () => openModal({ kind: "editKeys" }) : undefined}
        accessibilityRole={isAdmin ? "button" : undefined}
        accessibilityLabel={isAdmin ? "Edit keyset" : undefined}
      >
        {/* Image banner */}
        {imageUrl ? (
          <View style={styles.banner}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.bannerImage}
              resizeMode="cover"
            />
            <View style={styles.bannerBadge}>
              <Camera
                size={12}
                color={theme.colors.textInverse}
                strokeWidth={2}
              />
            </View>
          </View>
        ) : null}

        {/* Top info row */}
        <View style={styles.top}>
          <View
            style={[
              isAdmin ? styles.iconWrapLg : styles.iconWrap,
              overdue || isMissingDamaged
                ? styles.iconOverdue
                : isAvailable
                  ? styles.iconAvailable
                  : styles.iconOut,
            ]}
          >
            <KeyRound
              size={isAdmin ? 18 : 15}
              color={
                overdue || isMissingDamaged
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
              {isAdmin && (
                <KeyStatusChip status={overdue ? "overdue" : keySet.status} />
              )}
              {!isAdmin && availability && (
                <ReservationStatusChip availability={availability} />
              )}
              {isAdmin && (
                <Pill tone="neutral" size="sm">
                  {totalKeys} {totalKeys === 1 ? "key" : "keys"}
                </Pill>
              )}
            </View>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {keySet.name}
              </Text>
              {!isAdmin && overdue && (
                <Pill tone="danger" size="sm">
                  Overdue
                </Pill>
              )}
              {!isAdmin && (
                <Pill tone="neutral" size="sm">
                  {totalKeys} {totalKeys === 1 ? "key" : "keys"}
                </Pill>
              )}
            </View>
            {isAdmin ? <Text style={styles.code}>{keySet.code}</Text> : null}
          </View>

          {isAdmin && (
            <ShareQrButton
              variant="icon"
              code={keySet.code}
              title={keySet.name}
            />
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
                  style={[styles.metaValue, overdue && styles.metaValueDanger]}
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
                  <PhoneLink
                    phone={holderPhone}
                    textStyle={[
                      styles.metaValue,
                      overdue && styles.metaValueDanger,
                    ]}
                  />
                </View>
              )}
            </View>
          </View>
        )}

        {/* Keys list — embedded inside this card */}
        {keySet.keys && keySet.keys.length > 0 && (
          <>
            <View style={styles.keysDivider} />
            <KeySetKeysList />
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.md },

  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
  },
  cardPressed: { opacity: 0.85 },

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
    width: 34,
    height: 34,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconWrapLg: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.lg,
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
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  name: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.text,
  },
  code: { fontSize: 13, color: theme.colors.textMuted },

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

  keysDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
});

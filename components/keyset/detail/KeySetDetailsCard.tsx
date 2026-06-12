import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { KeyRound, MoreVertical, Pencil } from "lucide-react-native";
import { useRouter } from "expo-router";

import { BottomSheet, IconBadge, MetaRow, type MetaItem, ShareQrButton } from "@/components/ui";
import { theme } from "@/constants";
import {
  useCurrentUserId,
  useFirstKeySetImageUrl,
  useKeySet,
} from "@/lib/hooks";
import { useRole } from "@/hooks";
import { getTotalKeyQuantity } from "@/lib/utils";
import { getVisibleKeySetImages } from "@/lib/services";

import { getKeySetCardStatus } from "@/components/keyset/getKeySetCardStatus";
import { KeyStatusChip } from "@/components/keyset/KeyStatusChip";
import { useKeysetAvailabilityFor } from "@/components/keyset/useKeysetAvailability";
import { KeySetKeysList } from "./KeySetKeysList";
import { useKeySetScreen } from "./KeySetScreenContext";

// ── KeySetDetailsCard ───────────────────────────────────────────────────────

export function KeySetDetailsCard() {
  const { keySetId } = useKeySetScreen();
  const router = useRouter();
  const { data: keySet } = useKeySet(keySetId);
  const currentUserId = useCurrentUserId();
  const { isAdmin } = useRole();
  const availability = useKeysetAvailabilityFor(keySet);
  const { data: imageUrl } = useFirstKeySetImageUrl(keySet?.images);
  const [menuOpen, setMenuOpen] = useState(false);

  if (!keySet) return null;

  const hasImage = getVisibleKeySetImages(keySet.images ?? []).length > 0;

  const holderProfileId = keySet.current_holder?.profile_id;
  const { isCheckedOut, chipStatus } = getKeySetCardStatus(keySet, availability);
  const isHeldByMe = isCheckedOut && holderProfileId === currentUserId;
  const isHeldByOther = isCheckedOut && holderProfileId !== currentUserId;

  const totalKeys = getTotalKeyQuantity(keySet);
  const holderName = keySet.current_holder?.full_name;
  const holderType = keySet.current_holder?.holder_type;
  const holderPhone = keySet.current_holder?.phone;
  const showHolderMeta = !!keySet.current_holder && isHeldByOther;

  function pickEdit() {
    setMenuOpen(false);
    setTimeout(() => router.push(`/properties/keyset/edit/${keySetId}`), 250);
  }

  return (
    <>
      <View style={styles.card}>
        {/* Image banner */}
        {hasImage ? (
          <View style={styles.banner}>
            <View style={styles.bannerPlaceholder} />
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.bannerImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={180}
                recyclingKey={imageUrl}
                accessibilityIgnoresInvertColors
              />
            ) : null}
          </View>
        ) : null}

        {/* Top info row */}
        {isAdmin ? (
          /* ── Admin: name (big) + status badge, code · keys count below, ⋮ button ── */
          <View style={styles.top}>
            <IconBadge icon={KeyRound} tone="neutral" size="md" />
            <View style={styles.info}>
              <View style={styles.titleRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {keySet.name}
                </Text>
                <KeyStatusChip status={chipStatus} size="md" />
              </View>
              <Text style={styles.codePrefix} numberOfLines={1}>
                {keySet.code} · {totalKeys} {totalKeys === 1 ? "key" : "keys"}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.moreBtn,
                pressed && styles.moreBtnPressed,
              ]}
              onPress={() => setMenuOpen(true)}
              accessibilityLabel="Keyset options"
              hitSlop={8}
            >
              <MoreVertical size={20} color={theme.colors.textLight} strokeWidth={2} />
            </Pressable>
          </View>
        ) : (
          /* ── Agent: name · count inline + status badge ── */
          <View style={styles.top}>
            <IconBadge icon={KeyRound} tone="neutral" size="sm" />
            <View style={styles.info}>
              <View style={styles.titleRow}>
                <Text style={styles.nameAgent} numberOfLines={1}>
                  {keySet.name}
                  <Text style={styles.agentCount}>
                    {" "}· {totalKeys} {totalKeys === 1 ? "key" : "keys"}
                  </Text>
                </Text>
                <KeyStatusChip status={chipStatus} size="md" />
              </View>
            </View>
          </View>
        )}

        {showHolderMeta && (() => {
          const displayName = isHeldByMe ? "You" : (holderName ?? "Unknown");
          const showType = holderType && holderType !== "agent";
          const holderItems: MetaItem[] = [
            {
              label: "With",
              value: `${displayName}${showType ? ` · ${holderType}` : ""}`,
            },
            {
              label: "Contact",
              value: holderPhone ?? "No contact",
              phone: !!holderPhone,
            },
          ];
          return (
            <View style={styles.meta}>
              <View style={styles.metaDivider} />
              <MetaRow items={holderItems} divider={false} />
            </View>
          );
        })()}

        {/* Keys list */}
        {keySet.keys && keySet.keys.length > 0 && (
          <>
            <View style={styles.keysDivider} />
            <KeySetKeysList />
          </>
        )}
      </View>

      {/* Options sheet — admin only */}
      {isAdmin && (
        <BottomSheet visible={menuOpen} onClose={() => setMenuOpen(false)}>
          <Text style={styles.sheetTitle}>Keyset Options</Text>
          <View style={styles.menuItems}>
            <Pressable
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.menuItemPressed,
              ]}
              onPress={pickEdit}
            >
              <Pencil size={18} color={theme.colors.text} strokeWidth={1.8} />
              <Text style={styles.menuItemLabel}>Edit Keyset</Text>
            </Pressable>
            <View style={styles.sep} />
            <ShareQrButton
              variant="menuRow"
              code={keySet.code}
              title={keySet.name}
            />
          </View>
        </BottomSheet>
      )}
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
  },

  banner: { width: "100%", height: 160 },
  bannerPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.neutralSoft,
  },
  bannerImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },

  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  info: { flex: 1, gap: 2, minWidth: 0 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  codePrefix: {
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  name: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.text,
  },
  nameAgent: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text,
    letterSpacing: -0.1,
    flex: 1,
  },
  agentCount: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textMuted,
    letterSpacing: 0,
  },
  moreBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  moreBtnPressed: {
    backgroundColor: theme.colors.neutralSoft,
  },

  meta: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  metaDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  keysDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },

  // Sheet
  sheetTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textLight,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: theme.spacing.sm,
  },
  menuItems: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
    backgroundColor: theme.colors.surfaceWarm,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  menuItemPressed: {
    backgroundColor: theme.colors.neutralSoft,
  },
  menuItemLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: theme.colors.text,
    flex: 1,
  },
  sep: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: theme.spacing.md + 18 + theme.spacing.md,
  },
});

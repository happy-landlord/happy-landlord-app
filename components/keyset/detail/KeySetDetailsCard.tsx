import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { KeyRound, Pencil } from "lucide-react-native";
import { useRouter } from "expo-router";

import { IconBadge, MetaRow, type MetaItem, Pill, PillButton, ShareQrButton } from "@/components/ui";
import { theme } from "@/constants";
import {
  useCurrentUserId,
  useFirstKeySetImageUrl,
  useKeySet,
} from "@/lib/hooks";
import { useRole } from "@/hooks";
import { getTotalKeyQuantity } from "@/lib/utils";

import { getKeySetCardStatus } from "@/components/keyset/getKeySetCardStatus";
import { KeyStatusChip } from "@/components/keyset/KeyStatusChip";
import { useKeysetAvailabilityFor } from "@/components/keyset/useKeysetAvailability";
import { KeySetKeysList } from "./KeySetKeysList";
import { useKeySetScreen } from "./KeySetScreenContext";

// ── KeySetDetailsCard ───────────────────────────────────────────────────────
// Hero card on the keyset detail screen. Self-sufficient: pulls `keySet`,
// `currentUserId`, role, availability, and its banner image from hooks —
// the parent screen only needs to mount it inside `<KeySetScreenProvider>`.

export function KeySetDetailsCard() {
  const { keySetId } = useKeySetScreen();
  const router = useRouter();
  const { data: keySet } = useKeySet(keySetId);
  const currentUserId = useCurrentUserId();
  const { isAdmin } = useRole();
  const availability = useKeysetAvailabilityFor(keySet);
  const { data: imageUrl } = useFirstKeySetImageUrl(keySet?.images);

  if (!keySet) return null;

  const holderProfileId = keySet.current_holder?.profile_id;
  const { isCheckedOut, chipStatus } = getKeySetCardStatus(
    keySet,
    availability,
  );
  const isHeldByMe = isCheckedOut && holderProfileId === currentUserId;
  const isHeldByOther = isCheckedOut && holderProfileId !== currentUserId;

  const totalKeys = getTotalKeyQuantity(keySet);
  const holderName = keySet.current_holder?.full_name;
  const holderType = keySet.current_holder?.holder_type;
  const holderPhone = keySet.current_holder?.phone;
  const showHolderMeta = !!keySet.current_holder && isHeldByOther;

  return (
    <View style={styles.wrap}>
      {/* Edit + Share buttons above card when no image */}
      {isAdmin && !imageUrl && (
        <View style={styles.actionRow}>
          <PillButton
            label="Edit"
            variant="accent"
            icon={<Pencil size={14} color={theme.colors.accent} strokeWidth={2} />}
            onPress={() => router.push(`/properties/keyset/edit/${keySetId}`)}
            accessibilityLabel="Edit keyset"
          />
          <ShareQrButton
            variant="pill"
            code={keySet.code}
            title={keySet.name}
          />
        </View>
      )}

      <View style={styles.card}>
        {/* Image banner */}
        {imageUrl ? (
          <View style={styles.banner}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.bannerImage}
              resizeMode="cover"
            />
            {/* Floating Edit + Share overlay — top right */}
            {isAdmin && (
              <View style={styles.bannerOverlay}>
                <Pressable
                  style={({ pressed }) => [
                    styles.overlayBtn,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => router.push(`/properties/keyset/edit/${keySetId}`)}
                  accessibilityRole="button"
                  accessibilityLabel="Edit keyset"
                >
                  <Pencil size={13} color="#fff" strokeWidth={2} />
                  <Text style={styles.overlayBtnText}>Edit</Text>
                </Pressable>
                <ShareQrButton
                  variant="overlay"
                  code={keySet.code}
                  title={keySet.name}
                />
              </View>
            )}
          </View>
        ) : null}

        {/* Top info row — mirrors AdminKeySetCard layout for both roles */}
        {isAdmin ? (
          /* ── Admin: code prefix + status/count pills + name ── */
          <View style={styles.top}>
            <IconBadge icon={KeyRound} tone="neutral" size="md" />
            <View style={styles.info}>
              <View style={styles.topRow}>
                <Text style={styles.codePrefix} numberOfLines={1}>
                  {keySet.code}
                </Text>
                <View style={styles.pillsRow}>
                  <KeyStatusChip status={chipStatus} />
                  <Pill tone="neutral" size="sm">
                    {totalKeys} {totalKeys === 1 ? "key" : "keys"}
                  </Pill>
                </View>
              </View>
              <Text style={styles.name} numberOfLines={1}>
                {keySet.name}
              </Text>
            </View>
          </View>
        ) : (
          /* ── Agent: smaller icon + name + status/count pills (mirrors AgentKeySetCard) ── */
          <View style={styles.top}>
            <IconBadge icon={KeyRound} tone="neutral" size="sm" />
            <View style={styles.info}>
              <Text style={styles.nameAgent} numberOfLines={1}>
                {keySet.name}
              </Text>
            </View>
            <View style={styles.pillsRow}>
              <KeyStatusChip status={chipStatus} />
              <Pill tone="neutral" size="sm">
                {totalKeys} {totalKeys === 1 ? "key" : "keys"}
              </Pill>
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

        {/* Keys list — embedded inside this card */}
        {keySet.keys && keySet.keys.length > 0 && (
          <>
            <View style={styles.keysDivider} />
            <KeySetKeysList />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.xs },

  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: theme.spacing.sm,
  },

  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
  },

  banner: { width: "100%", height: 160 },
  bannerImage: { width: "100%", height: "100%" },
  bannerOverlay: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    gap: 6,
  },
  overlayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
    backgroundColor: "rgba(0,0,0,0.52)",
  },
  overlayBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },

  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },

  info: { flex: 1, gap: 2, minWidth: 0 },
  topRow: {
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
  pillsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
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
});

import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { AlertTriangle, Phone } from "lucide-react-native";
import { useRouter } from "expo-router";

import { BottomSheet, Button, PhoneLink } from "@/components/ui";
import { KeySetPropertyCard } from "@/components/keyset";
import { theme } from "@/constants";
import {
  useAgentHeldKeySets,
  useDeactivateAgent,
  useProfileImageUrl,
} from "@/lib/hooks";
import type { AgentProfile } from "@/lib/services";

function formatJoined(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type Props = {
  agent: AgentProfile | null;
  onClose: () => void;
};

export function AgentDetailsSheet({ agent, onClose }: Props) {
  const router = useRouter();
  const profileId = agent?.id ?? null;
  const { data: heldKeySets, isLoading } = useAgentHeldKeySets(profileId);
  const deactivate = useDeactivateAgent();
  const [confirming, setConfirming] = useState(false);

  const visible = agent !== null;
  const holdingCount = heldKeySets?.length ?? 0;
  const hasHoldings = holdingCount > 0;
  const name =
    agent?.full_name?.trim() ||
    agent?.key_holder_full_name?.trim() ||
    "Unknown name";

  const handleClose = deactivate.isPending ? () => {} : onClose;

  function requestDeactivate() {
    if (!agent) return;
    const message = hasHoldings
      ? `${name} is currently holding ${holdingCount} ${holdingCount === 1 ? "keyset" : "keysets"}. Deactivating will hide them from the agents list but the keysets will remain assigned. Continue?`
      : `Deactivate ${name}? They will be hidden from the agents list and cannot perform new check-outs.`;

    setConfirming(true);
    Alert.alert("Deactivate agent", message, [
      { text: "Cancel", style: "cancel", onPress: () => setConfirming(false) },
      {
        text: "Deactivate",
        style: "destructive",
        onPress: () => {
          setConfirming(false);
          deactivate.mutate(agent.id, { onSuccess: onClose });
        },
      },
    ]);
  }

  return (
    <BottomSheet visible={visible} onClose={handleClose}>
      {/* Sheet title */}
      <Text style={styles.sheetTitle}>Agent Details</Text>

      {/* Profile header — details-specific layout */}
      {agent && <AgentProfileHeader agent={agent} />}

      {/* Section heading */}
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionLabel}>Currently Holding</Text>
        <Text style={styles.sectionCount}>
          {isLoading
            ? "…"
            : `${holdingCount} ${holdingCount === 1 ? "keyset" : "keysets"}`}
        </Text>
      </View>

      {/* Keyset list */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <Text style={styles.emptyText}>Loading keysets…</Text>
        ) : holdingCount === 0 ? (
          <Text style={styles.emptyText}>
            Not holding any keysets right now.
          </Text>
        ) : (
          heldKeySets!.map((ks) => (
            <KeySetPropertyCard
              key={ks.id}
              item={ks}
              showHolder={false}
              hideCheckedOutBadge
              onPress={() => {
                onClose();
                router.push(`/(app)/properties/keyset/${ks.id}`);
              }}
            />
          ))
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {hasHoldings ? (
          <View style={styles.warningRow}>
            <AlertTriangle
              size={13}
              color={theme.colors.textMuted}
              strokeWidth={2}
            />
            <Text style={styles.warningText}>
              Reassign keysets before deactivating.
            </Text>
          </View>
        ) : null}
        <Button
          title="Deactivate Agent"
          variant="dangerOutline"
          onPress={requestDeactivate}
          loading={deactivate.isPending}
          disabled={deactivate.isPending || confirming}
        />
      </View>
    </BottomSheet>
  );
}

// ── Agent profile header (details-specific layout) ───────────────────────────

function AgentProfileHeader({ agent }: { agent: AgentProfile }) {
  const { data: imageUrl } = useProfileImageUrl(agent.profile_image);

  const name =
    agent.full_name?.trim() || agent.key_holder_full_name?.trim() || null;
  const mobile = agent.phone?.trim() || agent.key_holder_phone?.trim() || null;
  const initial = (name || agent.email || "?")[0].toUpperCase();

  return (
    <View style={styles.profileHeader}>
      {/* Avatar */}
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.avatar}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={160}
          recyclingKey={imageUrl}
        />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarInitial}>{initial}</Text>
        </View>
      )}

      {/* Info column */}
      <View style={styles.profileInfo}>
        <Text style={styles.profileName} numberOfLines={1}>
          {name ?? "Unknown name"}
        </Text>

        {/* Phone + joined date in one row */}
        <View style={styles.profileRow}>
          <Phone
            size={13}
            color={mobile ? theme.colors.textMuted : theme.colors.textLight}
            strokeWidth={1.8}
          />
          {mobile ? (
            <PhoneLink phone={mobile} textStyle={styles.profilePhone} />
          ) : (
            <Text style={styles.profileRowText}>No mobile</Text>
          )}
          <Text style={styles.joinedText}>
            Joined {formatJoined(agent.created_at)}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },

  // Profile header
  profileHeader: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: theme.spacing.sm + 2,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.sm + 2,
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    flexShrink: 0,
    alignSelf: "center",
  },
  avatarFallback: {
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.textInverse,
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    gap: 4,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 5,
  },
  profileRowText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  profilePhone: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  joinedText: {
    fontSize: 11,
    fontWeight: "500",
    color: theme.colors.textLight,
    letterSpacing: 0.1,
    marginLeft: "auto",
  },

  // Section heading
  sectionHeading: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  sectionCount: {
    fontSize: 12,
    color: theme.colors.textLight,
  },

  // Scroll
  scroll: { maxHeight: 300 },
  scrollContent: { gap: 6, paddingBottom: theme.spacing.xs },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textLight,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: theme.spacing.md,
  },

  // Footer
  footer: {
    paddingTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  warningRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  warningText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
});

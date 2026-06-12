import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { AlertTriangle, KeyRound, Mail, Phone } from "lucide-react-native";

import { BottomSheet, Button, EntityCard, PhoneLink, Pill } from "@/components/ui";
import { KeyStatusChip } from "@/components/keyset";
import { theme } from "@/constants";
import {
  useAgentHeldKeySets,
  useDeactivateAgent,
  useProfileImageUrl,
} from "@/lib/hooks";
import { formatShortAddress, getTotalKeyQuantity } from "@/lib/utils";
import type { CheckedOutKeySet, AgentProfile } from "@/lib/services";


type Props = {
  agent: AgentProfile | null;
  onClose: () => void;
};

export function AgentDetailsSheet({ agent, onClose }: Props) {
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
          heldKeySets!.map((ks) => <KeySetRow key={ks.id} keySet={ks} />)
        )}
      </ScrollView>


      {/* Footer */}
      <View style={styles.footer}>
        {hasHoldings ? (
          <View style={styles.warningRow}>
            <AlertTriangle size={13} color={theme.colors.textMuted} strokeWidth={2} />
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

        {agent.email ? (
          <View style={styles.profileRow}>
            <Mail size={13} color={theme.colors.textMuted} strokeWidth={1.8} />
            <Text style={styles.profileRowText} numberOfLines={1}>
              {agent.email}
            </Text>
          </View>
        ) : null}

        {mobile ? (
          <View style={styles.profileRow}>
            <Phone size={13} color={theme.colors.textMuted} strokeWidth={1.8} />
            <PhoneLink
              phone={mobile}
              textStyle={styles.profilePhone}
            />
          </View>
        ) : (
          <View style={styles.profileRow}>
            <Phone size={13} color={theme.colors.textLight} strokeWidth={1.8} />
            <Text style={styles.profileRowText}>No mobile</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ── KeySet row ────────────────────────────────────────────────────────────────

function KeySetRow({ keySet }: { keySet: CheckedOutKeySet }) {
  const keyCount = getTotalKeyQuantity(keySet);
  const address = formatShortAddress(keySet.property);
  const overdue = keySet.status === "overdue";
  const keyCountLabel = `${keyCount} ${keyCount === 1 ? "key" : "keys"}`;

  return (
    <EntityCard
      icon={KeyRound}
      iconTone={overdue ? "danger" : "neutral"}
      eyebrow={keySet.name}
      title={address}
      pills={
        <>
          <KeyStatusChip status={keySet.status} />
          <Pill tone="neutral" size="sm">{keyCountLabel}</Pill>
        </>
      }
    />
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
    alignItems: "center",
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    flexShrink: 0,
  },
  avatarFallback: {
    backgroundColor: theme.colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.accent,
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  profileName: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.text,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
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

  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
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

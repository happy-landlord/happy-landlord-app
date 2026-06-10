import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { AlertTriangle, KeyRound, Mail, X } from "lucide-react-native";

import { BottomSheet, Button, PhoneLink } from "@/components/ui";
import { theme } from "@/constants";
import {
  useAgentHeldKeySets,
  useDeactivateAgent,
  useProfileImageUrl,
} from "@/lib/hooks";
import { getTotalKeyQuantity } from "@/lib/utils";
import type { CheckedOutKeySet, AgentProfile } from "@/lib/services";

type Props = {
  agent: AgentProfile | null;
  onClose: () => void;
};

/**
 * Bottom sheet showing an agent's identity, the keysets they're currently
 * holding (checked out / overdue), and an action to deactivate the agent.
 */
export function AgentDetailsSheet({ agent, onClose }: Props) {
  const profileId = agent?.id ?? null;
  const { data: heldKeySets, isLoading } = useAgentHeldKeySets(profileId);
  const deactivate = useDeactivateAgent();
  const { data: imageUrl } = useProfileImageUrl(agent?.profile_image);
  const [confirming, setConfirming] = useState(false);

  const visible = agent !== null;
  const holdingCount = heldKeySets?.length ?? 0;
  const hasHoldings = holdingCount > 0;
  const name =
    agent?.full_name?.trim() ||
    agent?.key_holder_full_name?.trim() ||
    "Unknown name";
  const initial = (name || agent?.email || "?")[0].toUpperCase();
  const phone = agent?.phone?.trim() || agent?.key_holder_phone?.trim() || null;

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
          deactivate.mutate(agent.id, {
            onSuccess: onClose,
          });
        },
      },
    ]);
  }

  return (
    <BottomSheet visible={visible} onClose={handleClose}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.avatarImage}
              contentFit="cover"
              transition={120}
            />
          ) : (
            <Text style={styles.avatarInitial}>{initial}</Text>
          )}
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={1}>
            {name}
          </Text>
          {agent?.email ? (
            <View style={styles.contactRow}>
              <Mail size={12} color={theme.colors.textMuted} strokeWidth={2} />
              <Text style={styles.contactText} numberOfLines={1}>
                {agent.email}
              </Text>
            </View>
          ) : null}
          {phone ? (
            <PhoneLink
              phone={phone}
              showIcon
              iconSize={12}
              iconColor={theme.colors.textMuted}
              style={styles.contactRow}
              textStyle={styles.contactText}
            />
          ) : null}
        </View>
        <Pressable
          onPress={onClose}
          disabled={deactivate.isPending}
          hitSlop={8}
          style={({ pressed }) => [
            styles.closeBtn,
            pressed && { opacity: 0.6 },
          ]}
        >
          <X size={20} color={theme.colors.textMuted} strokeWidth={2} />
        </Pressable>
      </View>

      {/* Section heading */}
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>Currently holding</Text>
        <Text style={styles.sectionCount}>
          {isLoading
            ? "…"
            : `${holdingCount} ${holdingCount === 1 ? "keyset" : "keysets"}`}
        </Text>
      </View>

      {/* Body */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <Text style={styles.emptyText}>Loading keysets…</Text>
        ) : holdingCount === 0 ? (
          <Text style={styles.emptyText}>
            This agent is not holding any keysets right now.
          </Text>
        ) : (
          <View style={styles.list}>
            {heldKeySets!.map((ks) => (
              <KeySetRow key={ks.id} keySet={ks} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Footer action */}
      <View style={styles.footer}>
        {hasHoldings ? (
          <View style={styles.warningRow}>
            <AlertTriangle
              size={14}
              color={theme.colors.warning}
              strokeWidth={2}
            />
            <Text style={styles.warningText}>
              Agent still holds keysets — reassign before deactivating.
            </Text>
          </View>
        ) : null}
        <Button
          title="Deactivate agent"
          variant="dangerOutline"
          onPress={requestDeactivate}
          loading={deactivate.isPending}
          disabled={deactivate.isPending || confirming}
        />
      </View>
    </BottomSheet>
  );
}

// ── KeySet row (compact CollectFromTenantSheet-style) ────────────────────────

function KeySetRow({ keySet }: { keySet: CheckedOutKeySet }) {
  const keyCount = getTotalKeyQuantity(keySet);
  const address =
    keySet.property?.address ??
    keySet.property?.formatted_address ??
    "Property";
  const overdue = keySet.status === "overdue";

  return (
    <View style={[styles.row, overdue && styles.rowOverdue]}>
      <View style={styles.rowIcon}>
        <KeyRound size={14} color={theme.colors.primary} strokeWidth={1.8} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>
          {keySet.name}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {address}
        </Text>
        <Text style={styles.rowSubmeta}>
          {keyCount} {keyCount === 1 ? "key" : "keys"} · {keySet.code}
        </Text>
      </View>
      {overdue ? (
        <View style={styles.overdueBadge}>
          <Text style={styles.overdueLabel}>Overdue</Text>
        </View>
      ) : null}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const AVATAR_SIZE = 48;

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: theme.colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarInitial: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  headerText: { flex: 1, gap: 3, minWidth: 0 },
  title: { fontSize: 18, fontWeight: "700", color: theme.colors.text },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  contactText: { fontSize: 12, color: theme.colors.textMuted, flexShrink: 1 },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.neutralSoft,
  },

  sectionHeading: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  sectionCount: { fontSize: 12, color: theme.colors.textLight },

  scroll: { maxHeight: 320 },
  scrollContent: { paddingBottom: theme.spacing.xs },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textLight,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: theme.spacing.md,
  },
  list: { gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rowOverdue: {
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.dangerSoft,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowInfo: { flex: 1, gap: 2, minWidth: 0 },
  rowName: { fontSize: 13, fontWeight: "600", color: theme.colors.text },
  rowMeta: { fontSize: 12, color: theme.colors.textMuted },
  rowSubmeta: { fontSize: 11, color: theme.colors.textLight },
  overdueBadge: {
    paddingVertical: 2,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.danger,
  },
  overdueLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.surface,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  footer: {
    paddingTop: theme.spacing.md,
    gap: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginTop: theme.spacing.sm,
  },
  warningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.warning,
    fontWeight: "500",
  },
});

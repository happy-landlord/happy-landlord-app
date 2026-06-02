import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowRightCircle, KeyRound } from "lucide-react-native";

import { KEY_TYPE_ICON, theme } from "@/constants";
import { TransferConfirmModal } from "@/components/keyset";
import { EmptyState } from "@/components/ui";
import { useTransferKeySet } from "@/lib/hooks";
import {
  alertError,
  formatDate,
  getKeyName,
  getTotalKeyQuantity,
} from "@/lib/utils";
import type { KeySetWithDetails } from "@/lib/services";

export type AgentKeysViewProps = {
  keySets: KeySetWithDetails[];
};

export function AgentKeysView({ keySets }: AgentKeysViewProps) {
  // Agents never need to see missing/damaged keysets — hide them entirely
  const visibleKeySets = keySets.filter(
    (ks) => ks.status !== "missing_damaged",
  );

  if (visibleKeySets.length === 0) {
    return (
      <EmptyState
        title="No key sets"
        message="No key sets available for this property."
      />
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {visibleKeySets.length}{" "}
          {visibleKeySets.length === 1 ? "Key Set" : "Key Sets"}
        </Text>
        <View style={styles.list}>
          {visibleKeySets.map((ks) => (
            <AgentKeySetCard key={ks.id} keySet={ks} />
          ))}
        </View>
      </View>
    </View>
  );
}

// ── AgentKeySetCard ──────────────────────────────────────────────────────────

function AgentKeySetCard({ keySet }: { keySet: KeySetWithDetails }) {
  const [showTransferModal, setShowTransferModal] = useState(false);
  const transferMut = useTransferKeySet(keySet.property_id);

  const handleTransfer = useCallback(() => {
    transferMut.mutate(
      { keySetId: keySet.id },
      {
        onSuccess: () => setShowTransferModal(false),
        onError: (err) => alertError("Transfer failed", err),
      },
    );
  }, [transferMut, keySet.id]);

  const overdue = keySet.status === "overdue";
  const isAvailable = keySet.status === "available";
  const isCheckedOut = keySet.status === "checked_out" || overdue;
  const isHandover =
    keySet.status === "handover_tenant" ||
    keySet.status === "handover_landlord";

  const holderName = keySet.current_holder?.full_name;
  const holderType = keySet.current_holder?.holder_type;
  const holderPhone = keySet.current_holder?.phone;
  const totalKeys = getTotalKeyQuantity(keySet);
  const keyCountLabel = `${totalKeys} ${totalKeys === 1 ? "key" : "keys"}`;
  const keys = keySet.keys ?? [];

  const iconBg = overdue
    ? theme.colors.dangerSoft
    : isAvailable
      ? theme.colors.successSoft
      : theme.colors.warningSoft;
  const iconColor = overdue
    ? theme.colors.danger
    : isAvailable
      ? theme.colors.success
      : theme.colors.warning;
  const cardBorderColor = overdue ? theme.colors.danger : theme.colors.border;

  return (
    <>
      <View style={[styles.card, { borderColor: cardBorderColor }]}>
        {/* Top row: icon + title/count */}
        <View style={styles.top}>
          <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
            <KeyRound size={22} color={iconColor} strokeWidth={1.8} />
          </View>
          <View style={styles.info}>
            <View style={styles.titleRow}>
              <Text style={styles.name} numberOfLines={2}>
                {keySet.name}
              </Text>
              <View style={styles.countPill}>
                <Text style={styles.countText}>{keyCountLabel}</Text>
              </View>
            </View>

            {keys.length > 0 && (
              <View style={styles.keyPillsWrap}>
                {keys.map((k) => {
                  const Icon = KEY_TYPE_ICON[k.key_type] ?? KeyRound;
                  const label = getKeyName(k);
                  return (
                    <View key={k.id} style={styles.keyPill}>
                      <Icon
                        size={12}
                        color={theme.colors.primary}
                        strokeWidth={1.8}
                      />
                      <Text style={styles.keyPillText} numberOfLines={1}>
                        {label}
                      </Text>
                      {k.quantity > 1 && (
                        <View style={styles.keyPillQty}>
                          <Text style={styles.keyPillQtyText}>
                            ×{k.quantity}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        {/* Holder meta — shown when checked out / overdue / handover */}
        {(isCheckedOut || isHandover) && holderName && (
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
                  {holderName}
                  {holderType && holderType !== "agent"
                    ? ` · ${holderType}`
                    : ""}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Contact</Text>
                <Text
                  style={[
                    styles.metaValue,
                    overdue && styles.metaValueDanger,
                  ]}
                  numberOfLines={1}
                >
                  {holderPhone ?? "No contact"}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.actionWrap}>
          {keySet.due_back_at && (
            <Text
              style={[
                styles.dueDateText,
                overdue && styles.dueDateTextOverdue,
              ]}
              numberOfLines={1}
            >
              {overdue ? "Was due" : "Due"} {formatDate(keySet.due_back_at)}
            </Text>
          )}
          <Pressable
            style={({ pressed }) => [
              styles.transferButton,
              transferMut.isPending && styles.transferButtonDisabled,
              pressed &&
                !transferMut.isPending &&
                styles.transferButtonPressed,
            ]}
            onPress={() => setShowTransferModal(true)}
            disabled={transferMut.isPending}
            accessibilityRole="button"
            accessibilityLabel={`Transfer ${keySet.name} to me`}
          >
            <ArrowRightCircle size={16} color="#fff" strokeWidth={2} />
            <Text style={styles.transferButtonText}>
              {transferMut.isPending ? "Transferring…" : "Transfer to Me"}
            </Text>
          </Pressable>
        </View>
      </View>

      <TransferConfirmModal
        visible={showTransferModal}
        keySetName={keySet.name}
        currentHolderName={holderName ?? null}
        transferringKeys={keys}
        dueBackAt={keySet.due_back_at ?? null}
        isPending={transferMut.isPending}
        onCancel={() => setShowTransferModal(false)}
        onConfirm={handleTransfer}
      />
    </>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { gap: theme.spacing.md },
  section: { gap: theme.spacing.sm },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingLeft: 2,
  },
  list: { gap: 8 },

  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
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
  info: { flex: 1, gap: 10, minWidth: 0 },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  countPill: {
    minHeight: 20,
    flexShrink: 0,
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
  name: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.text,
    letterSpacing: -0.2,
  },
  keyPillsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  keyPill: {
    maxWidth: "100%",
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: theme.colors.primarySoft,
  },
  keyPillText: {
    maxWidth: 130,
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.primaryDark,
  },
  keyPillQty: {
    minWidth: 18,
    height: 18,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    backgroundColor: theme.colors.surface,
  },
  keyPillQtyText: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.primaryDark,
  },
  meta: { paddingHorizontal: theme.spacing.md },
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
  metaValue: { fontSize: 13, fontWeight: "600", color: theme.colors.text },
  metaValueDanger: { color: theme.colors.danger },
  actionWrap: {
    padding: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  dueDateText: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.warning,
  },
  dueDateTextOverdue: { color: theme.colors.danger },
  transferButton: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
  },
  transferButtonPressed: { opacity: 0.75 },
  transferButtonDisabled: { opacity: 0.55 },
  transferButtonText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});


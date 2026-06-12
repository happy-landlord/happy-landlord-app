import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants";
import { KeySetCard, TransferConfirmModal } from "@/components/keyset";
import { Button, EmptyState } from "@/components/ui";
import { useTransferKeySet } from "@/lib/hooks";
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
// Thin agent-side wrapper: owns the transfer modal + mutation state and
// delegates all rendering to the shared `KeySetCard`. Renders its
// "Transfer to Me" button into the card's `footer` slot.

function AgentKeySetCard({ keySet }: { keySet: KeySetWithDetails }) {
  const [showTransferModal, setShowTransferModal] = useState(false);
  const transferMut = useTransferKeySet(keySet.property_id);

  const handleTransfer = useCallback(() => {
    transferMut.mutate(
      { keySetId: keySet.id },
      { onSuccess: () => setShowTransferModal(false) },
    );
  }, [transferMut, keySet.id]);

  const holderName = keySet.current_holder?.full_name ?? null;
  const keys = keySet.keys ?? [];

  return (
    <>
      <KeySetCard
        keySet={keySet}
        variant="agent"
        footer={
          <Button
            title={transferMut.isPending ? "Transferring…" : "Transfer to Me"}
            variant="accent"
            size="md"
            loading={transferMut.isPending}
            disabled={transferMut.isPending}
            onPress={() => setShowTransferModal(true)}
            accessibilityLabel={`Transfer ${keySet.name} to me`}
          />
        }
      />

      <TransferConfirmModal
        visible={showTransferModal}
        keySetName={keySet.name}
        currentHolderName={holderName}
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
});

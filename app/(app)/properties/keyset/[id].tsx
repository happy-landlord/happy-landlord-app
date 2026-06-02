import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  KeySetActionsPanel,
  KeySetDurationModal,
  KeySetEditSheet,
  KeySetIdentityCard,
  KeySetKeysList,
  KeySetLastActivity,
  ReturnConfirmModal,
  TransferConfirmModal,
} from "@/components/keyset";
import { PropertyHeader } from "@/components/property";
import { ErrorState, LoadingState } from "@/components/ui";
import { useKeySetActions, useRole } from "@/hooks";
import { useCurrentUserId, useKeySet, useProperty } from "@/lib/hooks";
import { theme } from "@/constants";
// -- Keyset detail screen ----------------------------------------------------
// Coordinator: data fetching, modal state and role-aware composition of the
// keyset detail sub-components. Visual logic (image fetching, activity preview,
// holder derivations, etc.) lives in `@/components/keyset/*` so this screen
// stays focused on flow.
export default function KeySetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const currentUserId = useCurrentUserId();
  const { isAdmin } = useRole();
  const { data: keySet, isPending, isError, refetch } = useKeySet(id);
  const { data: property } = useProperty(keySet?.property_id ?? "");
  const actions = useKeySetActions({ keySet, currentUserId, isAdmin });
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutDays, setCheckoutDays] = useState(1);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendDays, setExtendDays] = useState(1);
  const [editKeysOpen, setEditKeysOpen] = useState(false);
  // -- Render states ---------------------------------------------------------
  if (isPending) return <LoadingState message="Loading keyset..." />;
  if (isError || !keySet) {
    return (
      <ErrorState
        title="Keyset not found"
        message="Could not load this keyset."
        onRetry={refetch}
      />
    );
  }
  // Agents should not interact with missing/damaged keysets they do not hold
  if (
    !isAdmin &&
    actions.isMissingDamaged &&
    keySet.current_holder?.profile_id !== currentUserId
  ) {
    return (
      <ErrorState
        title="Keyset unavailable"
        message="This keyset has been reported as missing or damaged and is not available."
        onRetry={refetch}
      />
    );
  }
  const showLastActivity = isAdmin && keySet.status === "available";
  return (
    <>
      <Stack.Screen options={{ title: keySet.name }} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + theme.spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {property && <PropertyHeader property={property} />}
        <KeySetIdentityCard
          keySet={keySet}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onEditPress={isAdmin ? () => setEditKeysOpen(true) : undefined}
        />
        <KeySetKeysList keys={keySet.keys ?? []} />
        {showLastActivity && (
          <KeySetLastActivity keySetId={keySet.id} keySetName={keySet.name} />
        )}
        <KeySetActionsPanel
          actions={actions}
          isAdmin={isAdmin}
          dueBackAt={keySet.due_back_at}
          onAdminReturnPress={() => setShowReturnModal(true)}
          onCheckoutPress={() => {
            setCheckoutDays(1);
            setShowCheckoutModal(true);
          }}
          onExtendPress={() => {
            setExtendDays(1);
            setShowExtendModal(true);
          }}
          onTransferPress={() => setShowTransferModal(true)}
        />
      </ScrollView>
      {/* Checkout modal */}
      <KeySetDurationModal
        visible={showCheckoutModal}
        title="Checkout keyset"
        subtitle="Select how long you need the keyset."
        durationDays={checkoutDays}
        baseIso={undefined}
        isPending={actions.isCheckoutPending}
        onDurationChange={setCheckoutDays}
        onCancel={() => setShowCheckoutModal(false)}
        onConfirm={() =>
          actions.checkout(checkoutDays, () => setShowCheckoutModal(false))
        }
        confirmLabel="Confirm Checkout"
      />
      {/* Extend modal */}
      <KeySetDurationModal
        visible={showExtendModal}
        title="Extend checkout"
        subtitle="Add more days from the current due date."
        durationDays={extendDays}
        baseIso={keySet.due_back_at ?? undefined}
        isPending={actions.isExtendPending}
        onDurationChange={setExtendDays}
        onCancel={() => setShowExtendModal(false)}
        onConfirm={() =>
          actions.extend(extendDays, () => setShowExtendModal(false))
        }
        confirmLabel="Extend"
        confirmColor={theme.colors.primary}
      />
      {/* Admin: edit keys in this keyset */}
      {isAdmin && (
        <KeySetEditSheet
          visible={editKeysOpen}
          onClose={() => setEditKeysOpen(false)}
          propertyId={keySet.property_id}
          keySetId={keySet.id}
          keySetName={keySet.name}
          keys={keySet.keys ?? []}
        />
      )}
      {/* Admin: return confirm modal */}
      <ReturnConfirmModal
        visible={showReturnModal}
        propertyCode={property?.property_code ?? null}
        holderName={keySet.current_holder?.full_name ?? null}
        returningKeys={keySet.keys ?? []}
        dueBackAt={keySet.due_back_at ?? null}
        isPending={actions.isReturnPending}
        onCancel={() => setShowReturnModal(false)}
        onConfirm={() => actions.adminReturn(() => setShowReturnModal(false))}
      />
      {/* Agent: transfer confirm modal */}
      <TransferConfirmModal
        visible={showTransferModal}
        currentHolderName={keySet.current_holder?.full_name ?? null}
        dueBackAt={keySet.due_back_at ?? null}
        isPending={actions.isTransferPending}
        onCancel={() => setShowTransferModal(false)}
        onConfirm={() => actions.transfer(() => setShowTransferModal(false))}
      />
    </>
  );
}
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.screen,
    gap: theme.spacing.md,
  },
});
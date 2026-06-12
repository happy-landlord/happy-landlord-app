import { ScrollView, StyleSheet } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  KeySetActionsPanel,
  KeySetDetailsCard,
  KeySetLastActivity,
  KeySetModals,
  KeySetScreenProvider,
} from "@/components/keyset";
import { PropertyHeader } from "@/components/property";
import { ErrorState, LoadingState } from "@/components/ui";
import { useRole } from "@/hooks";
import { useCurrentUserId, useKeySet } from "@/lib/hooks";
import type { TenantHolder } from "@/lib/services";
import { theme } from "@/constants";

export default function KeySetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const currentUserId = useCurrentUserId();
  const { isAdmin } = useRole();
  const { data: keySet, isPending, isError, refetch } = useKeySet(id);

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

  const isMissingDamaged = keySet.status === "missing_damaged";
  if (
    !isAdmin &&
    isMissingDamaged &&
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

  const tenant: TenantHolder =
    keySet.status === "handover_tenant" &&
    keySet.current_holder?.holder_type === "tenant"
      ? {
          id: keySet.current_holder.profile_id ?? "",
          full_name: keySet.current_holder.full_name ?? null,
          phone: keySet.current_holder.phone ?? null,
        }
      : null;

  return (
    <KeySetScreenProvider keySetId={id}>
      <Stack.Screen options={{ title: keySet.name }} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + theme.spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {keySet.property_id && (
          <PropertyHeader
            propertyId={keySet.property_id}
            tenantOverride={tenant}
          />
        )}
        <KeySetDetailsCard />
        {showLastActivity && (
          <KeySetLastActivity keySetId={keySet.id} keySetName={keySet.name} />
        )}
        <KeySetActionsPanel />
      </ScrollView>
      <KeySetModals />
    </KeySetScreenProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.screen, gap: theme.spacing.md },
});

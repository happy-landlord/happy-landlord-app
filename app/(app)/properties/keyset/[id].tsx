import { ScrollView, StyleSheet } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  KeySetActionsPanel,
  KeySetIdentityCard,
  KeySetKeysList,
  KeySetLastActivity,
  KeySetModals,
  KeySetScreenProvider,
} from "@/components/keyset";
import { PropertyHeader } from "@/components/property";
import { ErrorState, LoadingState } from "@/components/ui";
import { useRole } from "@/hooks";
import {
  useCurrentUserId,
  useKeySet,
  useProperty,
} from "@/lib/hooks";
import { theme } from "@/constants";

// -- Keyset detail screen ----------------------------------------------------
// Orchestration only: fetches the keyset (to handle loading / error / access
// gating), then hands off to `<KeySetScreenProvider>`. Every child component
// reads its own data from TanStack + the screen context, so this file has no
// modal state and no callback wiring.
export default function KeySetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const currentUserId = useCurrentUserId();
  const { isAdmin } = useRole();
  const { data: keySet, isPending, isError, refetch } = useKeySet(id);
  const { data: property } = useProperty(keySet?.property_id ?? "");

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

  // Agents should not interact with missing/damaged keysets they do not hold.
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
        {property && <PropertyHeader property={property} hideEdit />}
        <KeySetIdentityCard />
        <KeySetKeysList />
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
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.screen,
    gap: theme.spacing.md,
  },
});

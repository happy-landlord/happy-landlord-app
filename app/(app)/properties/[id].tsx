import { ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { KeysSection } from "@/components/property/KeysSection";
import { PropertyHeader } from "@/components/property/PropertyHeader";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { theme } from "@/constants/theme";
import { useKeys } from "@/hooks/useKeySets";
import { useProperty } from "@/hooks/useProperties";
import { useRole } from "@/hooks/useRole";
import { useSession } from "@/hooks/useSession";

export default function PropertyDetailScreen() {
  const { id, selectDueAt, selectHolderId } = useLocalSearchParams<{
    id: string;
    selectDueAt?: string;
    selectHolderId?: string;
  }>();
  const insets = useSafeAreaInsets();
  const { isAdmin } = useRole();
  const { session } = useSession();
  const currentUserId = session?.user.id;

  const {
    data: property,
    isLoading: propertyLoading,
    isError: propertyError,
    refetch: refetchProperty,
  } = useProperty(id);

  const {
    data: keys,
    isLoading: keysLoading,
    isError: keysError,
    refetch: refetchKeys,
  } = useKeys(id);

  if (propertyLoading) {
    return <LoadingState message="Loading property…" />;
  }

  if (propertyError || !property) {
    return (
      <ErrorState
        title="Property not found"
        message="Could not load this property."
        onRetry={refetchProperty}
      />
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + theme.spacing.xl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerGroup}>
        <PropertyHeader
          property={property}
          onEdit={isAdmin ? () => {} : undefined}
        />
      </View>

      <KeysSection
        propertyId={id}
        propertyCode={property.property_code}
        keys={keys}
        isLoading={keysLoading}
        isError={keysError}
        onRetry={refetchKeys}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        selectDueAt={selectDueAt ?? null}
        selectHolderId={selectHolderId ?? null}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerGroup: {
    gap: theme.spacing.xs,
  },
  content: {
    padding: theme.spacing.screen,
    gap: theme.spacing.md,
  },
});

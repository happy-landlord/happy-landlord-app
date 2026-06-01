import { ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { KeySetsSection } from "@/components/property/KeySetsSection";
import { PropertyHeader } from "@/components/property/PropertyHeader";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { theme } from "@/constants/theme";
import { useKeySets, useUnassignedKeys } from "@/hooks/useKeySets";
import { useProperty } from "@/hooks/useProperties";

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const {
    data: property,
    isLoading: propertyLoading,
    isError: propertyError,
    refetch: refetchProperty,
  } = useProperty(id);

  const {
    data: keySets,
    isLoading: keySetsLoading,
    isError: keySetsError,
    refetch: refetchKeySets,
  } = useKeySets(id);

  const {
    data: unassignedKeys,
    isLoading: unassignedLoading,
    refetch: refetchUnassigned,
  } = useUnassignedKeys(id);

  if (propertyLoading) return <LoadingState message="Loading property…" />;

  if (propertyError || !property) {
    return (
      <ErrorState
        title="Property not found"
        message="Could not load this property."
        onRetry={refetchProperty}
      />
    );
  }

  const isLoading = keySetsLoading || unassignedLoading;

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
        <PropertyHeader property={property} />
      </View>

      <KeySetsSection
        propertyId={id}
        keySets={keySets}
        unassignedKeys={unassignedKeys}
        isLoading={isLoading}
        isError={keySetsError}
        onRetry={() => {
          refetchKeySets();
          refetchUnassigned();
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  headerGroup: { gap: theme.spacing.xs },
  content: { padding: theme.spacing.screen, gap: theme.spacing.md },

  compactHeader: { gap: 3 },
  compactTitle: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
  compactLocationRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  compactLocation: { fontSize: 13, color: theme.colors.textMuted },
});

import { ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { KeySetsSection } from "@/components/property/KeySetsSection";
import { LandlordCard } from "@/components/property/LandlordCard";
import { PropertyHeader } from "@/components/property/PropertyHeader";
import { PropertySummary } from "@/components/property/PropertySummary";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { theme } from "@/constants/theme";
import { useKeySets } from "@/hooks/useKeySets";
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
    isLoading: keysLoading,
    isError: keysError,
    refetch: refetchKeys,
  } = useKeySets(id);

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
        <PropertyHeader property={property} />
        <PropertySummary property={property} keySets={keySets} />
      </View>

      <KeySetsSection
        propertyId={id}
        keySets={keySets}
        isLoading={keysLoading}
        isError={keysError}
        onRetry={refetchKeys}
      />

      <LandlordCard property={property} />
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

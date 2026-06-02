import { ScrollView, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { KeySetsSection , PropertyHeader } from "@/components/property";
import { ErrorState , LoadingState } from "@/components/ui";
import { theme } from "@/constants";
import { useProperty } from "@/lib/hooks";

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const { data: property, isPending, isError, refetch } = useProperty(id);

  if (isPending) return <LoadingState message="Loading property…" />;

  if (isError || !property) {
    return (
      <ErrorState
        title="Property not found"
        message="Could not load this property."
        onRetry={refetch}
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
      <PropertyHeader property={property} />
      <KeySetsSection propertyId={id} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.screen, gap: theme.spacing.md },
});

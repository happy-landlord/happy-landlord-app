import {
  RefreshControl,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ErrorState, LoadingState } from "@/components/ui";
import {
  KeySetsSection,
  PropertyHeader,
} from "@/components/property";
import { theme } from "@/constants";
import { useProperty } from "@/lib/hooks";
import { useRefreshControl } from "@/hooks";

// ── Screen ────────────────────────────────────────────────────────────────────

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const { data: property, isPending, isError, refetch } = useProperty(id);
  const { refreshing, onRefresh } = useRefreshControl(refetch);

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
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.accentLight}
          colors={[theme.colors.accentLight]}
        />
      }
    >
      <PropertyHeader propertyId={id} />
      <KeySetsSection propertyId={id} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.screen, gap: theme.spacing.md },
});

import { memo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";

import { KeySetCard } from "@/components/keyset/KeySetCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { theme } from "@/constants/theme";
import type { KeySetWithHolder } from "@/services/keys.service";

export type KeySetsSectionProps = {
  propertyId: string;
  keySets: KeySetWithHolder[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
};

export const KeySetsSection = memo(function KeySetsSection({
  propertyId,
  keySets,
  isLoading,
  isError,
  onRetry,
}: KeySetsSectionProps) {
  const router = useRouter();

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Keysets</Text>
      {renderBody({
        propertyId,
        keySets,
        isLoading,
        isError,
        onRetry,
        onPressKeyset: (keysetId) =>
          router.push(`/(app)/properties/${propertyId}/keysets/${keysetId}` as never),
      })}
      <Pressable
        style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
        onPress={() => {}}
        accessibilityRole="button"
        accessibilityLabel="Add keyset"
      >
        <Plus size={16} color={theme.colors.primary} strokeWidth={2} />
        <Text style={styles.addButtonLabel}>Add Keyset</Text>
      </Pressable>
    </View>
  );
});

function renderBody({
  keySets,
  isLoading,
  isError,
  onRetry,
  onPressKeyset,
}: KeySetsSectionProps & { onPressKeyset: (keysetId: string) => void }): ReactNode {
  if (isError) {
    return (
      <ErrorState
        title="Couldn't load key sets"
        message="Check your connection and try again."
        onRetry={onRetry}
      />
    );
  }

  if (isLoading) {
    return <LoadingState message="Loading key sets…" />;
  }

  if (!keySets || keySets.length === 0) {
    return (
      <EmptyState
        title="No key sets"
        message="No key sets have been added for this property."
      />
    );
  }

  return (
    <View style={styles.list}>
      {keySets.map((ks) => (
        <KeySetCard
          key={ks.id}
          keySet={ks}
          onPress={() => onPressKeyset(ks.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: theme.spacing.sm,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingLeft: 2,
  },
  list: {
    gap: theme.spacing.sm,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderStyle: "dashed",
    paddingVertical: 13,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.primarySoft,
  },
  addButtonPressed: {
    opacity: 0.7,
  },
  addButtonLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.primary,
  },
});

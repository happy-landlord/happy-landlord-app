import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CompanyKeySetCard } from "@/components/keyset/CompanyKeySetCard";
import { KeyInventoryList } from "@/components/keyset/KeyInventoryList";
import { KeyStatusChip, SET_TYPE_LABEL } from "@/components/KeyStatusChip";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { theme } from "@/constants/theme";
import { useKeySet } from "@/hooks/useKeySets";
import { useProperty } from "@/hooks/useProperties";
import { useSession } from "@/hooks/useSession";
import { ArrowRightLeft, ClipboardList, KeyRound } from "lucide-react-native";

export default function KeySetDetailScreen() {
  const { keysetId } = useLocalSearchParams<{
    id: string;
    keysetId: string;
  }>();
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const currentUserId = session?.user.id ?? "";

  const { data: keySet, isLoading, isError, refetch } = useKeySet(keysetId);
  const { data: property } = useProperty(keySet?.property_id ?? "");

  if (isLoading) {
    return <LoadingState message="Loading keyset…" />;
  }

  if (isError || !keySet) {
    return (
      <ErrorState
        title="Keyset not found"
        message="Could not load this keyset."
        onRetry={refetch}
      />
    );
  }

  const typeLabel = `${SET_TYPE_LABEL[keySet.set_type] ?? keySet.set_type} Keyset`;
  const totalKeys = (keySet.inventory?.items ?? []).reduce(
    (sum, item) => sum + (item.quantity ?? 0),
    0,
  );
  const isCompany = keySet.set_type === "company";
  const isTenant = keySet.set_type === "tenant";

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + theme.spacing.xl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.iconWrap}>
            <KeyRound size={24} color={theme.colors.primary} strokeWidth={1.8} />
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.typeLabel}>{typeLabel}</Text>
            <Text style={styles.setCode}>{keySet.set_code}</Text>
          </View>

          <View style={styles.statusWrap}>
            <KeyStatusChip status={keySet.status} />
          </View>
        </View>
      </View>

      {/* Keys */}
      {keySet.inventory?.items && keySet.inventory.items.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {totalKeys} {totalKeys === 1 ? "Key" : "Keys"}
          </Text>
          <KeyInventoryList items={keySet.inventory.items} />
        </View>
      )}

      {/* Company keyset actions */}
      {isCompany && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <CompanyKeySetCard
            keySet={keySet}
            currentUserId={currentUserId}
            propertyCode={property?.property_code ?? null}
          />
        </View>
      )}

      {/* Tenant keyset actions */}
      {isTenant && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.actionsCard}>
            <Pressable
              style={({ pressed }) => [
                styles.handoverBtn,
                pressed && styles.handoverBtnPressed,
              ]}
              onPress={() => {}}
              accessibilityRole="button"
              accessibilityLabel="Handover tenant keys"
            >
              <ArrowRightLeft size={16} color="#fff" strokeWidth={2} />
              <Text style={styles.handoverBtnLabel}>Handover</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.activityBtn, pressed && styles.activityBtnPressed]}
              onPress={() => {}}
              accessibilityRole="button"
              accessibilityLabel="View activity"
            >
              <ClipboardList size={16} color={theme.colors.primary} strokeWidth={2} />
              <Text style={styles.activityBtnLabel}>View Activity</Text>
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
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
  headerCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.md,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: {
    flex: 1,
    gap: 6,
  },
  typeLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
  setCode: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  statusWrap: {
    paddingTop: 2,
    alignItems: "flex-end",
  },
  section: {
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingLeft: 2,
  },
  actionsCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  handoverBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: 13,
    paddingHorizontal: theme.spacing.md,
  },
  handoverBtnPressed: {
    opacity: 0.75,
  },
  handoverBtnLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  activityBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingVertical: 13,
    paddingHorizontal: theme.spacing.md,
  },
  activityBtnPressed: {
    opacity: 0.7,
  },
  activityBtnLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.primary,
  },
});



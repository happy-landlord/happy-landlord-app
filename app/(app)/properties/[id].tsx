import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Building2, Pencil, Users } from "lucide-react-native";
import { useState } from "react";

import { Button, PillButton, ErrorState, LoadingState } from "@/components/ui";
import {
  CollectFromTenantSheet,
  HandoverLandlordSheet,
  HandoverTenantSheet,
  KeySetsSection,
  PropertyHeader,
} from "@/components/property";
import { theme } from "@/constants";
import { useProperty } from "@/lib/hooks";
import { useRole, useRefreshControl } from "@/hooks";

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAdmin } = useRole();

  const { data: property, isPending, isError, refetch } = useProperty(id);
  const { refreshing, onRefresh } = useRefreshControl(refetch);
  const [tenantSheetOpen, setTenantSheetOpen] = useState(false);
  const [collectSheetOpen, setCollectSheetOpen] = useState(false);
  const [landlordSheetOpen, setLandlordSheetOpen] = useState(false);

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
    <>
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
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {isAdmin && (
          <View style={styles.headerGroup}>
            <View style={styles.editRow}>
              <PillButton
                label="Edit"
                variant="accent"
                icon={<Pencil size={14} color={theme.colors.accent} strokeWidth={2} />}
                onPress={() => router.push(`/properties/edit/${id}`)}
                accessibilityLabel="Edit property"
              />
            </View>
            <PropertyHeader propertyId={id} />
          </View>
        )}
        {!isAdmin && <PropertyHeader propertyId={id} />}

        {isAdmin && property.status === "active" && (
          <View style={styles.handoverRow}>
            <Button
              title="Handover to Tenant"
              variant="primary"
              size="sm"
              icon={<Users size={15} color={theme.colors.accent} strokeWidth={2} />}
              onPress={() => setTenantSheetOpen(true)}
              style={styles.handoverBtn}
            />
            <Button
              title="Handover to Landlord"
              variant="outline"
              size="sm"
              icon={<Building2 size={15} color={theme.colors.text} strokeWidth={2} />}
              onPress={() => setLandlordSheetOpen(true)}
              style={styles.handoverBtn}
            />
          </View>
        )}

        {isAdmin && property.status === "leased" && (
          <View style={styles.handoverRow}>
            <Button
              title="Collect from Tenant"
              variant="primary"
              size="sm"
              icon={<Users size={15} color={theme.colors.accent} strokeWidth={2} />}
              onPress={() => setCollectSheetOpen(true)}
              style={styles.handoverBtnCentered}
            />
          </View>
        )}

        <KeySetsSection propertyId={id} />
      </ScrollView>

      {isAdmin && (
        <>
          <HandoverTenantSheet
            visible={tenantSheetOpen}
            onClose={() => setTenantSheetOpen(false)}
            propertyId={id}
          />
          <CollectFromTenantSheet
            visible={collectSheetOpen}
            onClose={() => setCollectSheetOpen(false)}
            propertyId={id}
          />
          <HandoverLandlordSheet
            visible={landlordSheetOpen}
            onClose={() => setLandlordSheetOpen(false)}
            propertyId={id}
          />
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.screen, gap: theme.spacing.md },
  editRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  headerGroup: {
    gap: theme.spacing.xs,
  },
  handoverRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "center",
  },
  handoverBtn: { flex: 1 },
  handoverBtnCentered: {
    alignSelf: "center",
    paddingHorizontal: theme.spacing.lg,
  },
});

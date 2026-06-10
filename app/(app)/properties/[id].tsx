import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Building2, Pencil, Users } from "lucide-react-native";
import { useState } from "react";

import { PillButton, ErrorState, LoadingState } from "@/components/ui";
import {
  CollectFromTenantSheet,
  HandoverLandlordSheet,
  HandoverTenantSheet,
  KeySetsSection,
  PropertyEditSheet,
  PropertyHeader,
} from "@/components/property";
import { theme } from "@/constants";
  import { useProperty } from "@/lib/hooks";
  import { useRole, useRefreshControl } from "@/hooks";

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { isAdmin } = useRole();

  const { data: property, isPending, isError, refetch } = useProperty(id);
  const { refreshing, onRefresh } = useRefreshControl(refetch);
  const [tenantSheetOpen, setTenantSheetOpen] = useState(false);
  const [collectSheetOpen, setCollectSheetOpen] = useState(false);
  const [landlordSheetOpen, setLandlordSheetOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

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
                onPress={() => setEditOpen(true)}
                accessibilityLabel="Edit property"
              />
            </View>
            <PropertyHeader propertyId={id} />
          </View>
        )}
        {!isAdmin && <PropertyHeader propertyId={id} />}

        {isAdmin && property.status === "active" && (
          <View style={styles.handoverRow}>
            <Pressable
              style={({ pressed }) => [
                styles.handoverBtn,
                styles.handoverTenantBtn,
                pressed && { opacity: 0.78 },
              ]}
              onPress={() => setTenantSheetOpen(true)}
            >
              <Users
                size={15}
                color={theme.colors.primaryText}
                strokeWidth={2}
              />
              <Text style={styles.handoverBtnText}>Handover to Tenant</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.handoverBtn,
                styles.handoverLandlordBtn,
                pressed && { opacity: 0.78 },
              ]}
              onPress={() => setLandlordSheetOpen(true)}
            >
              <Building2 size={15} color={theme.colors.text} strokeWidth={2} />
              <Text style={styles.handoverLandlordBtnText}>
                Handover to Landlord
              </Text>
            </Pressable>
          </View>
        )}

        {isAdmin && property.status === "leased" && (
          <View style={styles.handoverRow}>
            <Pressable
              style={({ pressed }) => [
                styles.handoverBtn,
                styles.handoverTenantBtn,
                styles.handoverBtnCentered,
                pressed && { opacity: 0.78 },
              ]}
              onPress={() => setCollectSheetOpen(true)}
            >
              <Users
                size={15}
                color={theme.colors.primaryText}
                strokeWidth={2}
              />
              <Text style={styles.handoverBtnText}>Collect from Tenant</Text>
            </Pressable>
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
          <PropertyEditSheet
            property={property}
            visible={editOpen}
            onClose={() => setEditOpen(false)}
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
  handoverBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.md,
  },
  handoverTenantBtn: {
    backgroundColor: theme.colors.primary,
  },
  handoverBtnCentered: {
    flex: 0,
    alignSelf: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  handoverLandlordBtn: {
    backgroundColor: theme.colors.neutralSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  handoverBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.primaryText,
  },
  handoverLandlordBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.text,
  },
});

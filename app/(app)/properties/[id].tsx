import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Building2,
  ChevronDown,
  Pencil,
  Users,
  ArrowDownToLine,
} from "lucide-react-native";
import { useRef, useState } from "react";

import { PillButton, ErrorState, LoadingState } from "@/components/ui";
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

// ── HandoverMenu ──────────────────────────────────────────────────────────────

type HandoverMenuProps = {
  status: string;
  onTenant: () => void;
  onLandlord: () => void;
  onCollect: () => void;
};

function HandoverMenu({
  status,
  onTenant,
  onLandlord,
  onCollect,
}: HandoverMenuProps) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<View>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);

  const isLeased = status === "leased";

  function openMenu() {
    btnRef.current?.measureInWindow((x, y, width, height) => {
      setMenuPos({ top: y + height + 4, right: 0 });
      setOpen(true);
    });
  }

  function pick(action: () => void) {
    setOpen(false);
    action();
  }

  // When leased — single direct action, no dropdown
  if (isLeased) {
    return (
      <PillButton
        label="Collect"
        variant="accent"
        icon={<ArrowDownToLine size={14} color={theme.colors.accent} strokeWidth={2} />}
        onPress={onCollect}
        accessibilityLabel="Collect from tenant"
      />
    );
  }

  return (
    <View ref={btnRef} collapsable={false}>
      <PillButton
        label="Handover"
        variant="accent"
        icon={<ChevronDown size={14} color={theme.colors.accent} strokeWidth={2} />}
        onPress={openMenu}
        accessibilityLabel="Handover options"
      />

      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />

        {menuPos && (
          <View style={[dropStyles.panel, { top: menuPos.top, right: theme.spacing.screen }]}>
            <Pressable style={dropStyles.item} onPress={() => pick(onTenant)}>
              <Users size={15} color={theme.colors.text} strokeWidth={1.8} />
              <Text style={dropStyles.itemText}>Handover to Tenant</Text>
            </Pressable>
            <View style={dropStyles.sep} />
            <Pressable style={dropStyles.item} onPress={() => pick(onLandlord)}>
              <Building2 size={15} color={theme.colors.text} strokeWidth={1.8} />
              <Text style={dropStyles.itemText}>Handover to Landlord</Text>
            </Pressable>
          </View>
        )}
      </Modal>
    </View>
  );
}

const dropStyles = StyleSheet.create({
  panel: {
    position: "absolute",
    minWidth: 210,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: 13,
    paddingHorizontal: theme.spacing.md,
  },
  itemText: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.text,
  },
  sep: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.md,
  },
});

// ── Screen ────────────────────────────────────────────────────────────────────

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
              <HandoverMenu
                status={property.status}
                onTenant={() => setTenantSheetOpen(true)}
                onLandlord={() => setLandlordSheetOpen(true)}
                onCollect={() => setCollectSheetOpen(true)}
              />
            </View>
            <PropertyHeader propertyId={id} />
          </View>
        )}
        {!isAdmin && <PropertyHeader propertyId={id} />}

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
    gap: theme.spacing.sm,
  },
  headerGroup: {
    gap: theme.spacing.xs,
  },
});

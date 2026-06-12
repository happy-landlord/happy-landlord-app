import { StyleSheet, Text, View } from "react-native";
import { KeyRound } from "lucide-react-native";

import { ConfirmSheet, IconBadge } from "@/components/ui";
import { theme } from "@/constants";
import { useCollectFromTenant, useKeySets } from "@/lib/hooks";
import { getTotalKeyQuantity } from "@/lib/utils";

type Props = {
  visible: boolean;
  onClose: () => void;
  propertyId: string;
};

export function CollectFromTenantSheet({
  visible,
  onClose,
  propertyId,
}: Props) {
  const { data: keySets = [] } = useKeySets(propertyId);
  const collectMut = useCollectFromTenant(propertyId);

  const tenantKeySets = keySets.filter((ks) => ks.status === "handover_tenant");

  function handleConfirm() {
    collectMut.mutate(undefined, {
      onSuccess: onClose,
    });
  }

  return (
    <ConfirmSheet
      visible={visible}
      title="Collect from Tenant"
      subtitle="Confirm you have received the following keysets back from the tenant. The property will be set back to active."
      confirmLabel="Confirm"
      confirmTone="primary"
      isPending={collectMut.isPending}
      onCancel={onClose}
      onConfirm={handleConfirm}
      scrollMaxHeight={280}
    >
      {tenantKeySets.length === 0 ? (
        <Text style={styles.emptyText}>No keysets currently with tenant.</Text>
      ) : (
        <View style={styles.list}>
          {tenantKeySets.map((ks) => {
            const keyCount = getTotalKeyQuantity(ks);
            return (
              <View key={ks.id} style={styles.row}>
                <IconBadge icon={KeyRound} tone="neutral" size="md" />
                <View style={styles.rowInfo}>
                  <View style={styles.rowEyebrowRow}>
                    <Text style={styles.rowEyebrow} numberOfLines={1}>
                      {ks.code}
                    </Text>
                    <View style={styles.keyCountBadge}>
                      <Text style={styles.keyCountText}>
                        {keyCount} {keyCount === 1 ? "key" : "keys"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {ks.name}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ConfirmSheet>
  );
}

const styles = StyleSheet.create({
  emptyText: {
    fontSize: 13,
    color: theme.colors.textLight,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: theme.spacing.sm,
  },
  list: { gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rowInfo: { flex: 1, gap: 2, minWidth: 0 },
  rowEyebrowRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowEyebrow: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textMuted,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  keyCountBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.neutralSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  keyCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  rowName: { fontSize: 14, fontWeight: "700", color: theme.colors.text },
});

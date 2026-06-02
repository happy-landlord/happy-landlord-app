import { StyleSheet, Text, View } from "react-native";
import { CheckCheck, KeyRound } from "lucide-react-native";

import { ConfirmSheet } from "@/components/ui";
import { theme } from "@/constants";
import { useCollectFromTenant, useKeySets } from "@/lib/hooks";
import { alertError } from "@/lib/utils";

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
      onError: (err) =>
        alertError("Error", err, "Failed to collect keys from tenant."),
    });
  }

  return (
    <ConfirmSheet
      visible={visible}
      title="Collect from Tenant"
      subtitle="Confirm you have received the following keysets back from the tenant. The property will be set back to active."
      confirmLabel="Confirm"
      confirmTone="success"
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
            const keyCount = ks.keys?.length ?? 0;
            return (
              <View key={ks.id} style={styles.row}>
                <View style={styles.rowIcon}>
                  <KeyRound
                    size={14}
                    color={theme.colors.primary}
                    strokeWidth={1.8}
                  />
                </View>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {ks.name}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {keyCount} {keyCount === 1 ? "key" : "keys"} · {ks.code}
                  </Text>
                </View>
                <CheckCheck
                  size={16}
                  color={theme.colors.success}
                  strokeWidth={2}
                />
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
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowInfo: { flex: 1, gap: 2, minWidth: 0 },
  rowName: { fontSize: 13, fontWeight: "600", color: theme.colors.text },
  rowMeta: { fontSize: 11, color: theme.colors.textMuted },
});

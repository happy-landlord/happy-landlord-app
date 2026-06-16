import { StyleSheet, Text, View } from "react-native";
import { KeyRound, Package } from "lucide-react-native";

import { ConfirmSheet, IconBadge } from "@/components/ui";
import {
  useCollectFromLandlord,
  useKeySets,
  useUnassignedKeys,
} from "@/lib/hooks";
import { getTotalKeyQuantity, getKeyName } from "@/lib/utils";
import { summaryStyles } from "@/components/keyset/modals/KeySetSummaryRow";
import { theme, KEY_TYPE_ICON } from "@/constants";

type Props = {
  visible: boolean;
  onClose: () => void;
  propertyId: string;
};

export function CollectFromLandlordSheet({
  visible,
  onClose,
  propertyId,
}: Props) {
  const { data: keySets = [] } = useKeySets(propertyId);
  const { data: unassignedKeys = [] } = useUnassignedKeys(propertyId);
  const collectMut = useCollectFromLandlord(propertyId);

  const landlordKeySets = keySets.filter(
    (ks) => ks.status === "handover_landlord",
  );

  const totalUnassigned = unassignedKeys.reduce(
    (sum, k) => sum + (k.quantity ?? 1),
    0,
  );

  const hasContent = landlordKeySets.length > 0 || totalUnassigned > 0;

  function handleConfirm() {
    collectMut.mutate(undefined, { onSuccess: onClose });
  }

  return (
    <ConfirmSheet
      visible={visible}
      title="Collect from Landlord"
      subtitle="Confirm you have received all keysets and keys back from the landlord. The property will be set back to active."
      confirmLabel={collectMut.isPending ? "Collecting…" : "Confirm collection"}
      confirmTone="primary"
      isPending={collectMut.isPending}
      onCancel={onClose}
      onConfirm={handleConfirm}
      scrollMaxHeight={420}
    >
      {!hasContent ? (
        <Text style={styles.emptyText}>
          No keysets currently with landlord.
        </Text>
      ) : (
        <View style={styles.outerList}>
          {/* ── Keyset cards with individual keys ─────────────────────── */}
          {landlordKeySets.map((ks) => {
            const keyCount = getTotalKeyQuantity(ks);
            return (
              <View key={ks.id} style={summaryStyles.card}>
                {/* Keyset header */}
                <View style={styles.ksHeader}>
                  <IconBadge icon={KeyRound} tone="neutral" size="md" />
                  <View style={styles.ksHeaderInfo}>
                    <Text style={styles.ksEyebrow} numberOfLines={1}>
                      {ks.code}
                    </Text>
                    <Text style={styles.ksName} numberOfLines={1}>
                      {ks.name}
                    </Text>
                  </View>
                  <View style={styles.keyCountBadge}>
                    <Text style={styles.keyCountText}>
                      {keyCount} {keyCount === 1 ? "key" : "keys"}
                    </Text>
                  </View>
                </View>

                {/* Individual keys */}
                {ks.keys && ks.keys.length > 0 && (
                  <>
                    <View style={summaryStyles.dividerFull} />
                    <View style={styles.ksKeysPadded}>
                      {ks.keys.map((k) => {
                        const Icon = KEY_TYPE_ICON[k.key_type] ?? KeyRound;
                        const label = getKeyName(k);
                        return (
                          <View key={k.id} style={styles.keyRow}>
                            <View style={styles.keyIconCircle}>
                              <Icon size={12} color={theme.colors.accent} strokeWidth={1.8} />
                            </View>
                            <Text style={styles.keyLabel} numberOfLines={1}>{label}</Text>
                            {k.code ? (
                              <View style={styles.codeBadge}>
                                <Text style={styles.codeText} numberOfLines={1}>{k.code}</Text>
                              </View>
                            ) : null}
                            <Text style={styles.qtyText}>x{k.quantity}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </>
                )}
              </View>
            );
          })}

          {/* ── Unassigned keys section ────────────────────────────────── */}
          {unassignedKeys.length > 0 && (
            <View style={summaryStyles.card}>
              {/* Section header */}
              <View style={styles.ksHeader}>
                <IconBadge icon={Package} tone="neutral" size="md" />
                <View style={styles.ksHeaderInfo}>
                  <Text style={styles.ksEyebrow}>Unassigned</Text>
                  <Text style={styles.ksName} numberOfLines={1}>
                    Loose keys — not in any keyset
                  </Text>
                </View>
                <View style={styles.keyCountBadge}>
                  <Text style={styles.keyCountText}>
                    {totalUnassigned} {totalUnassigned === 1 ? "key" : "keys"}
                  </Text>
                </View>
              </View>

              <View style={summaryStyles.dividerFull} />

              {/* Individual unassigned key rows */}
              <View style={styles.ksKeysPadded}>
                {unassignedKeys.map((k) => {
                  const Icon = KEY_TYPE_ICON[k.key_type] ?? KeyRound;
                  const label = getKeyName(k);
                  return (
                    <View key={k.id} style={styles.keyRow}>
                      <View style={styles.keyIconCircle}>
                        <Icon
                          size={12}
                          color={theme.colors.textMuted}
                          strokeWidth={1.8}
                        />
                      </View>
                      <Text style={styles.keyLabel} numberOfLines={1}>
                        {label}
                      </Text>
                      {k.code ? (
                        <View style={styles.codeBadge}>
                          <Text style={styles.codeText} numberOfLines={1}>
                            {k.code}
                          </Text>
                        </View>
                      ) : null}
                      <Text style={styles.qtyText}>x{k.quantity ?? 1}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
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
  outerList: { gap: theme.spacing.sm },

  // ── Keyset card header ────────────────────────────────────────────────────
  ksHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
  },
  ksHeaderInfo: { flex: 1, gap: 1, minWidth: 0 },
  ksEyebrow: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  ksName: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text,
  },
  keyCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.neutralSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexShrink: 0,
  },
  keyCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },

  // ── Keys list inside card ─────────────────────────────────────────────────
  ksKeysPadded: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    gap: 6,
  },

  // ── Individual unassigned key row (mirrors SelectedKeysSummary full) ──────
  keyRow: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
  },
  keyIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.neutralSoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  keyLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
  },
  codeBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: theme.colors.surfaceWarm,
  },
  codeText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.text,
    letterSpacing: 0.2,
  },
  qtyText: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.primaryDark,
  },
});

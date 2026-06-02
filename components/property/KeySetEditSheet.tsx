import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyRound, Minus, Plus, X } from "lucide-react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { KEY_TYPE_ICON, KEY_TYPE_LABEL } from "@/components/key/keyLabels";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { theme } from "@/constants/theme";
import { QUERY_KEYS } from "@/lib/query/keys";
import { useUnassignedKeys } from "@/lib/hooks/useKeySets";
import { updateKeySet } from "@/lib/services/keySets.service";
import { createKeys, deleteKey, updateKey } from "@/lib/services/keys.service";
import type { KeyType } from "@/types/database";
import type { KeyInSet, UnassignedKey } from "@/lib/services/keySets.service";

type ComparableKey = Pick<
  KeyInSet | UnassignedKey,
  "key_type" | "label" | "code"
>;

function getKeyName(key: ComparableKey) {
  return (
    key.label?.trim() ||
    KEY_TYPE_LABEL[key.key_type as KeyType] ||
    key.key_type
  ).trim();
}

function getKeySignature(key: ComparableKey) {
  return [
    key.key_type,
    getKeyName(key).toLocaleLowerCase(),
    (key.code ?? "").trim().toLocaleLowerCase(),
  ].join("::");
}

// -- Component -----------------------------------------------------------------

export type KeyEditSheetProps = {
  visible: boolean;
  onClose: () => void;
  propertyId: string;
  keySetId: string;
  keySetName: string;
  keys: KeyInSet[];
};

export function KeySetEditSheet({
  visible,
  onClose,
  propertyId,
  keySetId,
  keySetName,
  keys,
}: KeyEditSheetProps) {
  const queryClient = useQueryClient();
  const [pendingName, setPendingName] = useState(keySetName ?? "");
  const { data: unassignedKeys = [] } = useUnassignedKeys(propertyId);

  useEffect(() => {
    if (visible) setPendingName(keySetName ?? "");
  }, [visible, keySetName]);

  // -- Invalidation helper ---------------------------------------------------

  function invalidate() {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.keySets.byProperty(propertyId),
    });
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.keySets.unassigned(propertyId),
    });
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.keySets.detail(keySetId),
    });
  }

  // -- Keyset name mutation --------------------------------------------------

  const saveNameMutation = useMutation({
    mutationFn: (name: string) => updateKeySet(keySetId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.keySets.byProperty(propertyId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.keySets.detail(keySetId),
      });
    },
    onError: (err: unknown) =>
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to save name.",
      ),
  });

  // -- Assign mutation -------------------------------------------------------
  // Same keys are matched by type + name + code.
  // If the same key is already assigned, increase its count and decrease the pool.
  // Otherwise qty > 1 ? reduce unassigned qty by 1 + create new assigned record (qty 1)
  // qty = 1 ? just move the record into this keyset

  const assignMutation = useMutation({
    mutationFn: async (k: UnassignedKey) => {
      const matchingAssigned = keys.find(
        (assignedKey) => getKeySignature(assignedKey) === getKeySignature(k),
      );

      if (matchingAssigned) {
        if (k.quantity > 1) {
          await updateKey(k.id, { quantity: k.quantity - 1 });
        } else {
          await deleteKey(k.id);
        }
        await updateKey(matchingAssigned.id, {
          quantity: (matchingAssigned.quantity ?? 1) + 1,
        });
        return;
      }

      if (k.quantity > 1) {
        await updateKey(k.id, { quantity: k.quantity - 1 });
        await createKeys([
          {
            property_id: propertyId,
            key_set_id: keySetId,
            key_type: k.key_type,
            label: k.label,
            code: k.code ?? null,
            quantity: 1,
            notes: null,
          },
        ]);
      } else {
        await updateKey(k.id, { key_set_id: keySetId });
      }
    },
    onSuccess: invalidate,
    onError: (err: unknown) =>
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to assign key.",
      ),
  });

  // -- Unassign mutation -----------------------------------------------------
  // Returns the FULL assigned quantity back to the unassigned pool.
  // If a matching unassigned key (same type + name + code) exists ? increment by k.quantity + delete this record
  // Otherwise ? just set key_set_id = null (keeps quantity intact)

  const unassignMutation = useMutation({
    mutationFn: async (k: KeyInSet) => {
      const matching = unassignedKeys.find(
        (u) => getKeySignature(u) === getKeySignature(k),
      );
      if (matching) {
        await updateKey(matching.id, {
          quantity: matching.quantity + (k.quantity ?? 1),
        });
        await deleteKey(k.id);
      } else {
        await updateKey(k.id, { key_set_id: null });
      }
    },
    onSuccess: invalidate,
    onError: (err: unknown) =>
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to unassign key.",
      ),
  });

  // -- Stepper mutation ------------------------------------------------------
  // "+" pulls 1 from the unassigned pool into this keyset.
  // "-" pushes 1 back to the unassigned pool (min assigned qty = 1).

  const changeQtyMutation = useMutation({
    mutationFn: async ({ key, delta }: { key: KeyInSet; delta: 1 | -1 }) => {
      const matching = unassignedKeys.find(
        (u) => getKeySignature(u) === getKeySignature(key),
      );
      if (delta === 1) {
        // Pull 1 from the unassigned pool
        if (!matching)
          throw new Error("No unassigned keys of this type available.");
        if (matching.quantity > 1) {
          await updateKey(matching.id, { quantity: matching.quantity - 1 });
        } else {
          await deleteKey(matching.id);
        }
        await updateKey(key.id, { quantity: (key.quantity ?? 1) + 1 });
      } else {
        // Push 1 back to the unassigned pool (min assigned qty = 1)
        if ((key.quantity ?? 1) <= 1) return;
        await updateKey(key.id, { quantity: (key.quantity ?? 1) - 1 });
        if (matching) {
          await updateKey(matching.id, { quantity: matching.quantity + 1 });
        } else {
          await createKeys([
            {
              property_id: propertyId,
              key_set_id: null,
              key_type: key.key_type,
              label: key.label ?? null,
              code: key.code ?? null,
              quantity: 1,
              notes: null,
            },
          ]);
        }
      }
    },
    onSuccess: invalidate,
    onError: (err: unknown) =>
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to update quantity.",
      ),
  });

  const busy =
    changeQtyMutation.isPending ||
    assignMutation.isPending ||
    unassignMutation.isPending ||
    saveNameMutation.isPending;

  // -- Helpers ---------------------------------------------------------------

  function handleSaveName() {
    const trimmed = (pendingName ?? "").trim();
    if (!trimmed || trimmed === keySetName) return;
    saveNameMutation.mutate(trimmed);
  }

  function handleQuantityChange(key: KeyInSet, delta: 1 | -1) {
    if (delta === 1) {
      const hasPool = unassignedKeys.some(
        (u) => getKeySignature(u) === getKeySignature(key),
      );
      if (!hasPool) {
        Alert.alert(
          "None available",
          "There are no unassigned keys of this type to add.",
        );
        return;
      }
    } else {
      if ((key.quantity ?? 1) <= 1) return;
    }
    changeQtyMutation.mutate({ key, delta });
  }

  function handleUnassign(key: KeyInSet) {
    unassignMutation.mutate(key);
  }

  // -- Render ----------------------------------------------------------------

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {/* Name */}
      <View style={styles.nameRow}>
        <TextInput
          style={styles.nameInput}
          value={pendingName}
          onChangeText={setPendingName}
          onBlur={handleSaveName}
          placeholder="Keyset name"
          placeholderTextColor={theme.colors.textLight}
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleSaveName}
          maxLength={60}
        />
        {saveNameMutation.isPending && (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        )}
      </View>

      <View style={styles.divider} />

      {/* Assigned keys */}
      <Text style={styles.sectionLabel}>Assigned keys</Text>

      {keys.length > 0 ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          nestedScrollEnabled
        >
          {keys.map((k) => {
            const Icon = KEY_TYPE_ICON[k.key_type as KeyType] ?? KeyRound;
            const label = getKeyName(k);
            const qty = k.quantity ?? 1;
            const hasMatchingUnassigned = unassignedKeys.some(
              (u) => getKeySignature(u) === getKeySignature(k),
            );
            return (
              <View key={k.id} style={styles.keyRow}>
                <View style={styles.keyIconCircle}>
                  <Icon
                    size={14}
                    color={theme.colors.primary}
                    strokeWidth={1.8}
                  />
                </View>
                <View style={styles.keyInfo}>
                  <Text style={styles.keyLabel} numberOfLines={1}>
                    {label}
                  </Text>
                  {k.code && <Text style={styles.keyCode}>{k.code}</Text>}
                </View>
                <View style={styles.stepper}>
                  <Pressable
                    onPress={() => handleQuantityChange(k, -1)}
                    disabled={changeQtyMutation.isPending || qty <= 1}
                    hitSlop={6}
                    style={[styles.stepBtn, qty <= 1 && styles.stepBtnDisabled]}
                  >
                    <Minus
                      size={12}
                      color={
                        qty <= 1 ? theme.colors.textLight : theme.colors.text
                      }
                      strokeWidth={2.5}
                    />
                  </Pressable>
                  <Text style={styles.stepVal}>{qty}</Text>
                  <Pressable
                    onPress={() => handleQuantityChange(k, 1)}
                    disabled={
                      changeQtyMutation.isPending || !hasMatchingUnassigned
                    }
                    hitSlop={6}
                    style={[
                      styles.stepBtn,
                      !hasMatchingUnassigned && styles.stepBtnDisabled,
                    ]}
                  >
                    <Plus
                      size={12}
                      color={
                        !hasMatchingUnassigned
                          ? theme.colors.textLight
                          : theme.colors.text
                      }
                      strokeWidth={2.5}
                    />
                  </Pressable>
                </View>
                <Pressable
                  onPress={() => handleUnassign(k)}
                  disabled={unassignMutation.isPending}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.removeBtn,
                    pressed && { opacity: 0.65 },
                  ]}
                >
                  {unassignMutation.isPending ? (
                    <ActivityIndicator size={13} color={theme.colors.danger} />
                  ) : (
                    <X
                      size={14}
                      color={theme.colors.danger}
                      strokeWidth={2.5}
                    />
                  )}
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <Text style={styles.emptyText}>No keys assigned yet.</Text>
      )}

      {/* Available to assign */}
      {unassignedKeys.length > 0 && (
        <>
          <View style={styles.divider} />
          <View style={styles.availableSection}>
            <Text style={styles.sectionLabel}>Available to assign</Text>
            <View style={styles.availablePillGrid}>
              {unassignedKeys.map((k) => {
                const Icon = KEY_TYPE_ICON[k.key_type as KeyType] ?? KeyRound;
                const label = getKeyName(k);
                return (
                  <Pressable
                    key={k.id}
                    style={[styles.availablePill, busy && { opacity: 0.5 }]}
                    onPress={() => assignMutation.mutate(k)}
                    disabled={busy}
                  >
                    <Icon
                      size={13}
                      color={theme.colors.textMuted}
                      strokeWidth={1.8}
                    />
                    <View style={styles.availablePillTextWrap}>
                      <Text style={styles.availablePillLabel} numberOfLines={1}>
                        {label}
                      </Text>
                      {k.code ? (
                        <Text
                          style={styles.availablePillCode}
                          numberOfLines={1}
                        >
                          {k.code}
                        </Text>
                      ) : null}
                    </View>
                    {k.quantity > 1 && (
                      <View style={styles.availableCountDot}>
                        <Text style={styles.availableCountDotText}>
                          {k.quantity}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </>
      )}
    </BottomSheet>
  );
}

// -- Styles --------------------------------------------------------------------

const styles = StyleSheet.create({
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  nameInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: theme.colors.textLight,
    marginBottom: theme.spacing.xs,
  },
  scroll: { maxHeight: 240 },
  scrollContent: { gap: 6, paddingBottom: 4 },
  keyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
  },
  keyIconCircle: {
    width: 30,
    height: 30,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  keyInfo: { flex: 1, gap: 2, minWidth: 0 },
  keyLabel: { fontSize: 13, fontWeight: "600", color: theme.colors.text },
  keyCode: { fontSize: 11, color: theme.colors.textMuted },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexShrink: 0,
  },
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.neutralSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stepBtnDisabled: { opacity: 0.35 },
  stepVal: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text,
    minWidth: 20,
    textAlign: "center",
  },
  removeBtn: {
    width: 30,
    height: 30,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textLight,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: theme.spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
  },
  keyRowDimmed: { opacity: 0.45 },
  keyIconCircleAvailable: { backgroundColor: theme.colors.neutralSoft },
  availableQtyBadge: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textMuted,
    flexShrink: 0,
  },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  assignedBadgeWrap: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.neutralSoft,
  },
  assignedBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.textLight,
    fontStyle: "italic",
  },
  // -- Available to assign pill grid (matches KeysStep style) ----------------
  availableSection: {
    gap: theme.spacing.sm,
    paddingTop: 2,
  },
  availablePillGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 8,
    rowGap: 10,
  },
  availablePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  availablePillLabel: {
    maxWidth: 110,
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  availablePillTextWrap: {
    maxWidth: 120,
    gap: 1,
  },
  availablePillCode: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.textLight,
  },
  availableCountDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.neutralSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  availableCountDotText: {
    fontSize: 10,
    fontWeight: "800",
    color: theme.colors.textMuted,
  },
  // -- Legacy (unused) -------------------------------------------------------
  pillWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
});

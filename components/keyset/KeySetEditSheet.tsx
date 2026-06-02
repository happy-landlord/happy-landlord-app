import { useEffect, useRef, useState } from "react";
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

import { KEY_TYPE_ICON, theme } from "@/constants";
import { BottomSheet } from "@/components/ui";
import { useDebouncedValue } from "@/hooks";
import {
  useCreateKeys,
  useDeleteKey,
  useUnassignedKeys,
  useUpdateKey,
  useUpdateKeySet,
} from "@/lib/hooks";
import { alertError, getKeyName, getKeySignature } from "@/lib/utils";
import type { KeyType } from "@/types";
import type { KeyInSet, UnassignedKey } from "@/lib/services";

// ── Component ─────────────────────────────────────────────────────────────────

export type KeySetEditSheetProps = {
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
}: KeySetEditSheetProps) {
  const [pendingName, setPendingName] = useState(keySetName ?? "");
  const { data: unassignedKeys = [] } = useUnassignedKeys(propertyId);

  // ── Mutations (shared TanStack hooks → consistent invalidation) ──────────
  const updateKeySetMut = useUpdateKeySet(propertyId, keySetId);
  const createKeysMut = useCreateKeys(propertyId);
  const updateKeyMut = useUpdateKey(propertyId);
  const deleteKeyMut = useDeleteKey(propertyId);

  const lastSavedNameRef = useRef(keySetName ?? "");

  useEffect(() => {
    if (visible) {
      setPendingName(keySetName ?? "");
      lastSavedNameRef.current = keySetName ?? "";
    }
  }, [visible, keySetName]);

  // ── Debounced name save ──────────────────────────────────────────────────
  // Drive the save off a debounced *value* (600 ms) so the user can keep
  // typing freely. The mutation fires exactly once per settled value.
  const debouncedName = useDebouncedValue(pendingName, 600);

  useEffect(() => {
    if (!visible) return;
    const trimmed = debouncedName.trim();
    if (!trimmed || trimmed === lastSavedNameRef.current) return;
    updateKeySetMut.mutate(
      { name: trimmed },
      {
        onSuccess: () => {
          lastSavedNameRef.current = trimmed;
        },
        onError: (err) => alertError("Error", err, "Failed to save name."),
      },
    );
    // updateKeySetMut intentionally omitted — mutate is stable and re-running
    // on every render here would trigger a feedback loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedName, visible]);

  function handleNameChange(value: string) {
    setPendingName(value);
  }

  // ── Pool helpers ─────────────────────────────────────────────────────────
  function findMatchingUnassigned(target: {
    key_type: string;
    label?: string | null;
    code?: string | null;
  }) {
    return unassignedKeys.find(
      (u) => getKeySignature(u) === getKeySignature(target),
    );
  }

  function findMatchingAssigned(target: {
    key_type: string;
    label?: string | null;
    code?: string | null;
  }) {
    return keys.find((k) => getKeySignature(k) === getKeySignature(target));
  }

  // ── Assign: move 1 unit from unassigned pool into this keyset ────────────
  // - Same key already assigned? bump its qty, decrement (or delete) pool item.
  // - Pool qty > 1?              decrement pool + create new assigned (qty 1).
  // - Pool qty = 1?              just reparent the existing record.
  async function handleAssign(k: UnassignedKey) {
    try {
      const matching = findMatchingAssigned(k);
      if (matching) {
        if (k.quantity > 1) {
          await updateKeyMut.mutateAsync({
            keyId: k.id,
            patch: { quantity: k.quantity - 1 },
          });
        } else {
          await deleteKeyMut.mutateAsync(k.id);
        }
        await updateKeyMut.mutateAsync({
          keyId: matching.id,
          patch: { quantity: (matching.quantity ?? 1) + 1 },
        });
        return;
      }
      if (k.quantity > 1) {
        await updateKeyMut.mutateAsync({
          keyId: k.id,
          patch: { quantity: k.quantity - 1 },
        });
        await createKeysMut.mutateAsync([
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
        await updateKeyMut.mutateAsync({
          keyId: k.id,
          patch: { key_set_id: keySetId },
        });
      }
    } catch (err) {
      alertError("Error", err, "Failed to assign key.");
    }
  }

  // ── Unassign: send the FULL assigned qty back to the pool ────────────────
  async function handleUnassign(k: KeyInSet) {
    try {
      const matching = findMatchingUnassigned(k);
      if (matching) {
        await updateKeyMut.mutateAsync({
          keyId: matching.id,
          patch: { quantity: matching.quantity + (k.quantity ?? 1) },
        });
        await deleteKeyMut.mutateAsync(k.id);
      } else {
        await updateKeyMut.mutateAsync({
          keyId: k.id,
          patch: { key_set_id: null },
        });
      }
    } catch (err) {
      alertError("Error", err, "Failed to unassign key.");
    }
  }

  // ── Stepper: ±1 between this keyset and the unassigned pool ──────────────
  async function handleQuantityChange(key: KeyInSet, delta: 1 | -1) {
    const matching = findMatchingUnassigned(key);
    if (delta === 1 && !matching) {
      Alert.alert(
        "None available",
        "There are no unassigned keys of this type to add.",
      );
      return;
    }
    if (delta === -1 && (key.quantity ?? 1) <= 1) return;

    try {
      if (delta === 1 && matching) {
        if (matching.quantity > 1) {
          await updateKeyMut.mutateAsync({
            keyId: matching.id,
            patch: { quantity: matching.quantity - 1 },
          });
        } else {
          await deleteKeyMut.mutateAsync(matching.id);
        }
        await updateKeyMut.mutateAsync({
          keyId: key.id,
          patch: { quantity: (key.quantity ?? 1) + 1 },
        });
      } else if (delta === -1) {
        await updateKeyMut.mutateAsync({
          keyId: key.id,
          patch: { quantity: (key.quantity ?? 1) - 1 },
        });
        if (matching) {
          await updateKeyMut.mutateAsync({
            keyId: matching.id,
            patch: { quantity: matching.quantity + 1 },
          });
        } else {
          await createKeysMut.mutateAsync([
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
    } catch (err) {
      alertError("Error", err, "Failed to update quantity.");
    }
  }

  const busy =
    createKeysMut.isPending ||
    updateKeyMut.isPending ||
    deleteKeyMut.isPending ||
    updateKeySetMut.isPending;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {/* Name */}
      <View style={styles.nameRow}>
        <TextInput
          style={styles.nameInput}
          value={pendingName}
          onChangeText={handleNameChange}
          placeholder="Keyset name"
          placeholderTextColor={theme.colors.textLight}
          autoCorrect={false}
          returnKeyType="done"
          maxLength={60}
        />
        {updateKeySetMut.isPending && (
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
            const hasMatchingUnassigned = !!findMatchingUnassigned(k);
            return (
              <View key={k.id} style={styles.keyRow}>
                <View style={styles.keyIconCircle}>
                  <Icon size={14} color={theme.colors.primary} strokeWidth={1.8} />
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
                    disabled={busy || qty <= 1}
                    hitSlop={6}
                    style={[styles.stepBtn, qty <= 1 && styles.stepBtnDisabled]}
                  >
                    <Minus
                      size={12}
                      color={qty <= 1 ? theme.colors.textLight : theme.colors.text}
                      strokeWidth={2.5}
                    />
                  </Pressable>
                  <Text style={styles.stepVal}>{qty}</Text>
                  <Pressable
                    onPress={() => handleQuantityChange(k, 1)}
                    disabled={busy || !hasMatchingUnassigned}
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
                  disabled={busy}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.removeBtn,
                    pressed && { opacity: 0.65 },
                  ]}
                >
                  {deleteKeyMut.isPending ? (
                    <ActivityIndicator size={13} color={theme.colors.danger} />
                  ) : (
                    <X size={14} color={theme.colors.danger} strokeWidth={2.5} />
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
                    onPress={() => handleAssign(k)}
                    disabled={busy}
                  >
                    <Icon size={13} color={theme.colors.textMuted} strokeWidth={1.8} />
                    <View style={styles.availablePillTextWrap}>
                      <Text style={styles.availablePillLabel} numberOfLines={1}>
                        {label}
                      </Text>
                      {k.code ? (
                        <Text style={styles.availablePillCode} numberOfLines={1}>
                          {k.code}
                        </Text>
                      ) : null}
                    </View>
                    {k.quantity > 1 && (
                      <View style={styles.availableCountDot}>
                        <Text style={styles.availableCountDotText}>{k.quantity}</Text>
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

// ── Styles ────────────────────────────────────────────────────────────────────

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
});

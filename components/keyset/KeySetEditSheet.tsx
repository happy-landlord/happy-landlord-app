import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyRound, Plus, X } from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";

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
import { QUERY_KEYS } from "@/lib/query";
import {
  fetchKeySetById,
  fetchUnassignedKeysForProperty,
} from "@/lib/services";
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
  const queryClient = useQueryClient();

  const updateKeySetMut = useUpdateKeySet(propertyId, keySetId);
  const createKeysMut = useCreateKeys(propertyId);
  const updateKeyMut = useUpdateKey(propertyId);
  const deleteKeyMut = useDeleteKey(propertyId);

  // Single in-flight gate — prevents fast double-taps from operating on
  // stale snapshots between sequential awaits.
  const actingRef = useRef(false);
  const [acting, setActing] = useState(false);

  const lastSavedNameRef = useRef(keySetName ?? "");

  useEffect(() => {
    if (visible) {
      setPendingName(keySetName ?? "");
      lastSavedNameRef.current = keySetName ?? "";
    }
  }, [visible, keySetName]);

  // ── Debounced name save ──────────────────────────────────────────────────
  const debouncedName = useDebouncedValue(pendingName, 600);

  useEffect(() => {
    if (!visible) return;
    const trimmed = debouncedName.trim();
    if (!trimmed || trimmed === lastSavedNameRef.current) return;
    updateKeySetMut.mutate(
      { name: trimmed },
      {
        onSuccess: () => { lastSavedNameRef.current = trimmed; },
        onError: (err) => alertError("Error", err, "Failed to save name."),
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedName, visible]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  // Re-read from the cache (forcing a fetch if stale) so multi-step handlers
  // never operate on a snapshot the previous step already mutated.
  async function freshUnassigned(): Promise<UnassignedKey[]> {
    return queryClient.fetchQuery({
      queryKey: QUERY_KEYS.keySets.unassigned(propertyId),
      queryFn: () => fetchUnassignedKeysForProperty(propertyId),
    });
  }
  async function freshAssigned(): Promise<KeyInSet[]> {
    const ks = await queryClient.fetchQuery({
      queryKey: QUERY_KEYS.keySets.detail(keySetId),
      queryFn: () => fetchKeySetById(keySetId),
    });
    return (ks?.keys ?? []) as KeyInSet[];
  }

  function matchBySig<T extends { key_type: string; label?: string | null; code?: string | null }>(
    list: T[],
    target: { key_type: string; label?: string | null; code?: string | null },
  ): T | undefined {
    const sig = getKeySignature(target);
    return list.find((x) => getKeySignature(x) === sig);
  }


  /**
   * Move ONE unit of `source` into `destKeySetId` (null = unassigned pool).
   * Strategy:
   *   - source qty > 1  → decrement source by 1 and either bump a matching
   *                       dest row or insert a new dest row (qty 1).
   *   - source qty == 1 → if a matching dest row exists, merge (bump dest,
   *                       delete source); otherwise just reparent source.
   */
  async function moveOne(
    source: KeyInSet | UnassignedKey,
    destList: (KeyInSet | UnassignedKey)[],
    destKeySetId: string | null,
  ) {
    const dest = matchBySig(destList, source);
    const srcQty = source.quantity ?? 1;

    if (srcQty > 1) {
      await updateKeyMut.mutateAsync({
        keyId: source.id,
        patch: { quantity: srcQty - 1 },
      });
      if (dest) {
        await updateKeyMut.mutateAsync({
          keyId: dest.id,
          patch: { quantity: (dest.quantity ?? 1) + 1 },
        });
      } else {
        await createKeysMut.mutateAsync([
          {
            property_id: propertyId,
            key_set_id: destKeySetId,
            key_type: source.key_type,
            label: source.label,
            code: source.code ?? null,
            quantity: 1,
            notes: null,
          },
        ]);
      }
      return;
    }

    // srcQty === 1
    if (dest) {
      await updateKeyMut.mutateAsync({
        keyId: dest.id,
        patch: { quantity: (dest.quantity ?? 1) + 1 },
      });
      await deleteKeyMut.mutateAsync(source.id);
    } else {
      await updateKeyMut.mutateAsync({
        keyId: source.id,
        patch: { key_set_id: destKeySetId },
      });
    }
  }

  async function runLocked(fn: () => Promise<void>, errMsg: string) {
    if (actingRef.current) return;
    actingRef.current = true;
    setActing(true);
    try {
      await fn();
    } catch (err) {
      alertError("Error", err, errMsg);
    } finally {
      actingRef.current = false;
      setActing(false);
    }
  }

  // ── Handlers (each moves exactly 1 unit) ────────────────────────────────
  function handleAssign(initial: UnassignedKey) {
    void runLocked(async () => {
      const pool = await freshUnassigned();
      const src = matchBySig(pool, initial);
      if (!src) return;
      const assigned = await freshAssigned();
      await moveOne(src, assigned, keySetId);
    }, "Failed to assign key.");
  }

  function handleUnassign(initial: KeyInSet) {
    void runLocked(async () => {
      const assigned = await freshAssigned();
      const src = assigned.find((x) => x.id === initial.id);
      if (!src) return;
      const pool = await freshUnassigned();
      await moveOne(src, pool, null);
    }, "Failed to unassign key.");
  }


  const busy =
    acting ||
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
          onChangeText={setPendingName}
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
            const qty = k.quantity ?? 1;
            return (
              <View key={k.id} style={styles.keyRow}>
                <View style={styles.keyIconCircle}>
                  <Icon size={14} color={theme.colors.primary} strokeWidth={1.8} />
                </View>
                <View style={styles.keyInfo}>
                  <Text style={styles.keyLabel} numberOfLines={1}>
                    {getKeyName(k)}
                  </Text>
                  {k.code ? (
                    <View style={styles.codeChip}>
                      <Text style={styles.codeChipText}>{k.code}</Text>
                    </View>
                  ) : null}
                </View>
                {qty > 1 && (
                  <View style={styles.qtyChip}>
                    <Text style={styles.qtyChipText}>{qty}</Text>
                  </View>
                )}
                <Pressable
                  onPress={() => handleUnassign(k)}
                  disabled={busy}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.removeBtn,
                    pressed && { opacity: 0.65 },
                  ]}
                >
                  <X size={14} color={theme.colors.danger} strokeWidth={2.5} />
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
          <Text style={styles.sectionLabel}>Available to assign</Text>
          <View style={styles.availableList}>
            {unassignedKeys.map((k) => {
              const Icon = KEY_TYPE_ICON[k.key_type as KeyType] ?? KeyRound;
              const qty = k.quantity ?? 1;
              return (
                <View key={k.id} style={styles.keyRow}>
                  <View style={styles.keyIconCircle}>
                    <Icon size={14} color={theme.colors.primary} strokeWidth={1.8} />
                  </View>
                  <View style={styles.keyInfo}>
                    <Text style={styles.keyLabel} numberOfLines={1}>
                      {getKeyName(k)}
                    </Text>
                    {k.code ? (
                      <View style={styles.codeChip}>
                        <Text style={styles.codeChipText}>{k.code}</Text>
                      </View>
                    ) : null}
                  </View>
                  {qty > 1 && (
                    <View style={styles.qtyChip}>
                      <Text style={styles.qtyChipText}>{qty}</Text>
                    </View>
                  )}
                  <Pressable
                    onPress={() => handleAssign(k)}
                    disabled={busy}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.addBtn,
                      pressed && { opacity: 0.65 },
                    ]}
                  >
                    <Plus size={14} color={theme.colors.success} strokeWidth={2.5} />
                  </Pressable>
                </View>
              );
            })}
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
  keyInfo: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  keyLabel: { fontSize: 13, fontWeight: "600", color: theme.colors.text, flexShrink: 1 },
  keyCode: { fontSize: 11, color: theme.colors.textMuted },
  codeChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.neutralSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexShrink: 0,
  },
  codeChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.textMuted,
    letterSpacing: 0.3,
  },
  qtyChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.neutralSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexShrink: 0,
  },
  qtyChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textMuted,
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
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.successSoft,
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
  availableList: {
    gap: 6,
    paddingBottom: 4,
  },
});

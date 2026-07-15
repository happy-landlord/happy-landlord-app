import { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { KeyRound } from "lucide-react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { BottomSheet, Button } from "@/components/ui";
import { KEY_TYPE_ICON, theme } from "@/constants";
import { QUERY_KEYS } from "@/lib/query";
import { createKeySet, fetchNextKeySetSeq, updateKey, type UnassignedKey } from "@/lib/services";
import { useProperty, useUnassignedKeys } from "@/lib/hooks";
import { getKeyName, showErrorToast, showSuccessToast } from "@/lib/utils";

// ── AddKeySetSheet ────────────────────────────────────────────────────────────

export type AddKeySetSheetProps = {
  visible: boolean;
  onClose: () => void;
  propertyId: string;
};

export function AddKeySetSheet({
  visible,
  onClose,
  propertyId,
}: AddKeySetSheetProps) {
  const queryClient = useQueryClient();
  const { data: property } = useProperty(propertyId);
  const { data: unassigned = [] } = useUnassignedKeys(propertyId);

  // ── Local state ──────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<UnassignedKey[]>([]);

  // Reset form whenever the sheet opens
  useEffect(() => {
    if (visible) {
      setName("");
      setSelectedKeys([]);
    }
  }, [visible]);

  // ── Key selection helpers ─────────────────────────────────────────────────
  const isSelected = (k: UnassignedKey) =>
    selectedKeys.some((s) => s.id === k.id);

  function toggleKey(k: UnassignedKey) {
    if (isSelected(k)) {
      setSelectedKeys((prev) => prev.filter((s) => s.id !== k.id));
    } else {
      setSelectedKeys((prev) => [...prev, k]);
    }
  }

  // ── Save mutation ─────────────────────────────────────────────────────────
  const { mutate: doSave, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      const trimmedName = name.trim();
      if (!trimmedName) throw new Error("name_required");

      const propertyCode = property?.property_code;
      if (!propertyCode) throw new Error("no_property_code");

      // Fetch the next safe sequence from the DB at mutation time — NOT from
      // the cached active-keyset count, which excludes inactive keysets that
      // still hold their qr_code in the unique index.
      const nextSeq = await fetchNextKeySetSeq(propertyId);
      const code = `S${nextSeq}`;

      // 1. Create the keyset row
      const keySet = await createKeySet({
        property_id: propertyId,
        code,
        name: trimmedName,
        status: "available",
        qr_code: `${propertyCode}-${code}`,
      });

      // 2. Assign selected unassigned keys to the new keyset
      if (selectedKeys.length > 0) {
        await Promise.all(
          selectedKeys.map((k) =>
            updateKey(k.id, { key_set_id: keySet.id }),
          ),
        );
      }

      return { keySet, selectedKeys };
    },
    onError: (err: Error) => {
      if (err.message === "name_required") {
        showErrorToast("Name required", "Please enter a name for this keyset.");
      } else {
        showErrorToast("Failed to create keyset", err.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.keySets.byProperty(propertyId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.keySets.unassigned(propertyId),
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      showSuccessToast("Keyset added");
      onClose();
    },
  });

  function handleSave() {
    if (!name.trim()) {
      showErrorToast("Name required", "Please enter a name for this keyset.");
      return;
    }
    doSave();
  }

  // ── Available keys = unassigned pool minus those already selected ──────────
  const availableKeys = unassigned.filter((k) => !isSelected(k));

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.sheetTitle}>Add Keyset</Text>

      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        bottomOffset={Platform.OS === "ios" ? 32 : 16}
        showsVerticalScrollIndicator={false}
      >
        {/* Name input */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Name</Text>
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Main Keyset"
              placeholderTextColor={theme.colors.textLight}
              autoCorrect={false}
              returnKeyType="done"
              maxLength={60}
              editable={!isSaving}
            />
          </View>
        </View>

        {/* Selected keys */}
        {selectedKeys.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Selected keys</Text>
            <View style={styles.keyList}>
              {selectedKeys.map((k) => {
                const Icon = KEY_TYPE_ICON[k.key_type] ?? KeyRound;
                return (
                  <Pressable
                    key={k.id}
                    onPress={() => toggleKey(k)}
                    disabled={isSaving}
                    style={({ pressed }) => [
                      styles.keyRow,
                      styles.selectedKeyRow,
                      pressed && { opacity: 0.65 },
                    ]}
                  >
                    <View style={[styles.keyIconCircle, styles.selectedKeyIconCircle]}>
                      <Icon size={14} color={theme.colors.surface} strokeWidth={1.8} />
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
                    {(k.quantity ?? 1) > 1 && (
                      <View style={styles.qtyChip}>
                        <Text style={styles.qtyChipText}>×{k.quantity}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Available to assign */}
        {availableKeys.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Available to assign</Text>
            <View style={styles.keyList}>
              {availableKeys.map((k) => {
                const Icon = KEY_TYPE_ICON[k.key_type] ?? KeyRound;
                return (
                  <Pressable
                    key={k.id}
                    onPress={() => toggleKey(k)}
                    disabled={isSaving}
                    style={({ pressed }) => [
                      styles.keyRow,
                      pressed && { opacity: 0.65 },
                    ]}
                  >
                    <View style={styles.keyIconCircle}>
                      <Icon size={14} color={theme.colors.accent} strokeWidth={1.8} />
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
                    {(k.quantity ?? 1) > 1 && (
                      <View style={styles.qtyChip}>
                        <Text style={styles.qtyChipText}>×{k.quantity}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {availableKeys.length === 0 && selectedKeys.length === 0 && (
          <Text style={styles.emptyText}>
            No unassigned keys available for this property.
          </Text>
        )}
      </KeyboardAwareScrollView>

      {/* Actions */}
      <View style={styles.footer}>
        <Button
          title="Cancel"
          variant="outline"
          onPress={onClose}
          disabled={isSaving}
          style={styles.cancelBtn}
        />
        <Button
          title={isSaving ? "Saving…" : "Save"}
          variant="primary"
          loading={isSaving}
          disabled={isSaving}
          onPress={handleSave}
          style={styles.saveBtn}
        />
      </View>
    </BottomSheet>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheetTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textLight,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: theme.spacing.sm,
  },
  scroll: { maxHeight: 480 },
  scrollContent: { gap: theme.spacing.lg, paddingBottom: theme.spacing.sm },

  section: { gap: theme.spacing.sm },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: theme.colors.textLight,
  },

  inputGroup: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    overflow: "hidden",
  },
  input: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 13,
    fontSize: 15,
    color: theme.colors.text,
  },

  keyList: { gap: 6 },
  keyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectedKeyRow: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accentLight,
  },
  keyIconCircle: {
    width: 30,
    height: 30,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  selectedKeyIconCircle: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  keyInfo: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  keyLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
    flexShrink: 1,
  },
  codeChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.neutralSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexShrink: 0,
  },
  codeChipText: { fontSize: 10, fontWeight: "700", color: theme.colors.textMuted },
  qtyChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.neutralSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexShrink: 0,
  },
  qtyChipText: { fontSize: 11, fontWeight: "700", color: theme.colors.textMuted },

  emptyText: {
    fontSize: 13,
    color: theme.colors.textLight,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: theme.spacing.sm,
  },

  footer: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  cancelBtn: { flex: 1 },
  saveBtn: { flex: 2 },
});




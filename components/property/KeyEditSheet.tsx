import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Check, ChevronDown, ChevronUp, KeyRound, Minus, Plus, Trash2 } from "lucide-react-native";

import { KEY_TYPE_ICON, KEY_TYPE_LABEL } from "@/components/key/keyLabels";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { theme } from "@/constants/theme";
import { useCreateKeys, useDeleteKey, useUpdateKey } from "@/hooks/useKeySets";
import type { DbKeyInsert, KeyType } from "@/types/database";
import type { KeyInSet } from "@/services/keySets.service";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ALL_KEY_TYPE_OPTIONS = (Object.keys(KEY_TYPE_LABEL) as KeyType[]).map(
  (type) => {
    const Icon = KEY_TYPE_ICON[type] ?? KeyRound;
    return {
      value: type,
      label: KEY_TYPE_LABEL[type],
      icon: <Icon size={16} color={theme.colors.textMuted} strokeWidth={1.8} />,
    };
  },
);

// ── Component ─────────────────────────────────────────────────────────────────

export type KeyEditSheetProps = {
  visible: boolean;
  onClose: () => void;
  propertyId: string;
  keySetId: string;
  keys: KeyInSet[];
};

export function KeyEditSheet({
  visible,
  onClose,
  propertyId,
  keySetId,
  keys,
}: KeyEditSheetProps) {
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [pendingType, setPendingType] = useState<KeyType>("main_door");
  const [pendingQty, setPendingQty] = useState(1);

  const createKeysMutation = useCreateKeys(propertyId);
  const deleteKeyMutation = useDeleteKey(propertyId);
  const updateKeyMutation = useUpdateKey(propertyId);

  const addBusy = createKeysMutation.isPending;
  const deleteBusy = deleteKeyMutation.isPending;
  const updateBusy = updateKeyMutation.isPending;

  // Types already in this keyset → exclude from add picker
  const existingTypes = new Set(keys.map((k) => k.key_type));
  const availableOptions = ALL_KEY_TYPE_OPTIONS.filter(
    (o) => !existingTypes.has(o.value),
  );
  const allTypesAdded = availableOptions.length === 0;

  const activePendingType = availableOptions.some((o) => o.value === pendingType)
    ? pendingType
    : (availableOptions[0]?.value ?? "main_door");

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleAdd() {
    if (pendingQty < 1 || addBusy) return;
    setTypePickerOpen(false);
    const insert: DbKeyInsert = {
      property_id: propertyId,
      key_set_id: keySetId,
      key_type: activePendingType,
      label: KEY_TYPE_LABEL[activePendingType] ?? activePendingType,
      quantity: pendingQty,
      notes: null,
    };
    createKeysMutation.mutate([insert], {
      onSuccess: () => setPendingQty(1),
      onError: (err) =>
        Alert.alert("Error", err instanceof Error ? err.message : "Failed to add key."),
    });
  }

  function handleQuantityChange(key: KeyInSet, delta: number) {
    const next = Math.max(1, (key.quantity ?? 1) + delta);
    if (next === key.quantity) return;
    updateKeyMutation.mutate(
      { keyId: key.id, patch: { quantity: next } },
      {
        onError: (err: unknown) =>
          Alert.alert("Error", err instanceof Error ? err.message : "Failed to update."),
      },
    );
  }

  function handleDelete(key: KeyInSet) {
    const label =
      key.key_type === "other"
        ? key.label
        : (KEY_TYPE_LABEL[key.key_type as KeyType] ?? key.key_type);
    Alert.alert(
      "Remove key?",
      `"${label}" will be permanently removed from this keyset.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () =>
            deleteKeyMutation.mutate(key.id, {
              onError: (err: unknown) =>
                Alert.alert("Error", err instanceof Error ? err.message : "Failed to remove."),
            }),
        },
      ],
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <Text style={styles.title}>Edit Keys</Text>
        <Text style={styles.subtitle}>Adjust quantities or add / remove key types.</Text>
      </View>

      {/* Existing keys */}
      {keys.length > 0 ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {keys.map((k) => {
            const Icon = KEY_TYPE_ICON[k.key_type as KeyType] ?? KeyRound;
            const label =
              k.key_type === "other"
                ? k.label
                : (KEY_TYPE_LABEL[k.key_type as KeyType] ?? k.key_type);
            const qty = k.quantity ?? 1;

            return (
              <View key={k.id} style={styles.keyRow}>
                <View style={styles.keyIconCircle}>
                  <Icon size={14} color={theme.colors.primary} strokeWidth={1.8} />
                </View>

                <View style={styles.keyInfo}>
                  <Text style={styles.keyLabel} numberOfLines={1}>{label}</Text>
                  {k.code && <Text style={styles.keyCode}>{k.code}</Text>}
                </View>

                <View style={styles.stepper}>
                  <Pressable
                    onPress={() => handleQuantityChange(k, -1)}
                    disabled={updateBusy || qty <= 1}
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
                    onPress={() => handleQuantityChange(k, +1)}
                    disabled={updateBusy}
                    hitSlop={6}
                    style={styles.stepBtn}
                  >
                    <Plus size={12} color={theme.colors.text} strokeWidth={2.5} />
                  </Pressable>
                </View>

                <Pressable
                  onPress={() => handleDelete(k)}
                  disabled={deleteBusy}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.deleteBtn,
                    pressed && styles.deleteBtnPressed,
                  ]}
                >
                  {deleteBusy ? (
                    <ActivityIndicator size={14} color={theme.colors.danger} />
                  ) : (
                    <Trash2 size={15} color={theme.colors.danger} strokeWidth={2} />
                  )}
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <Text style={styles.emptyText}>No keys yet. Add one below.</Text>
      )}

      <View style={styles.divider} />

      {/* Add key section */}
      {allTypesAdded ? (
        <Text style={styles.allAddedText}>All key types have been added.</Text>
      ) : (
        <View style={styles.addSection}>
          <View style={styles.addRow}>
            <View style={styles.typePickerWrapper}>
              <Pressable
                style={({ pressed }) => [
                  styles.typePicker,
                  typePickerOpen && styles.typePickerOpen,
                  pressed && styles.typePickerPressed,
                ]}
                onPress={() => setTypePickerOpen((v) => !v)}
                disabled={addBusy}
              >
                {(() => {
                  const Icon = KEY_TYPE_ICON[activePendingType] ?? KeyRound;
                  return <Icon size={15} color={theme.colors.textMuted} strokeWidth={1.8} />;
                })()}
                <Text style={styles.typePickerText} numberOfLines={1}>
                  {KEY_TYPE_LABEL[activePendingType]}
                </Text>
                {typePickerOpen
                  ? <ChevronUp size={14} color={theme.colors.textMuted} strokeWidth={2} />
                  : <ChevronDown size={14} color={theme.colors.textMuted} strokeWidth={2} />}
              </Pressable>

              {typePickerOpen && (
                <ScrollView
                  style={styles.inlinePicker}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                >
                  {availableOptions.map((opt) => {
                    const selected = opt.value === activePendingType;
                    return (
                      <Pressable
                        key={opt.value}
                        style={({ pressed }) => [
                          styles.inlinePickerOption,
                          selected && styles.inlinePickerOptionSelected,
                          pressed && styles.inlinePickerOptionPressed,
                        ]}
                        onPress={() => {
                          setPendingType(opt.value as KeyType);
                          setTypePickerOpen(false);
                        }}
                      >
                        <View style={styles.inlinePickerIcon}>{opt.icon}</View>
                        <Text
                          style={[styles.inlinePickerLabel, selected && styles.inlinePickerLabelSelected]}
                        >
                          {opt.label}
                        </Text>
                        {selected && (
                          <Check size={14} color={theme.colors.primary} strokeWidth={2.5} />
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            <View style={styles.stepper}>
              <Pressable
                onPress={() => setPendingQty((v) => Math.max(1, v - 1))}
                disabled={addBusy || pendingQty <= 1}
                hitSlop={6}
                style={[styles.stepBtn, pendingQty <= 1 && styles.stepBtnDisabled]}
              >
                <Minus
                  size={12}
                  color={pendingQty <= 1 ? theme.colors.textLight : theme.colors.text}
                  strokeWidth={2.5}
                />
              </Pressable>
              <Text style={styles.stepVal}>{pendingQty}</Text>
              <Pressable
                onPress={() => setPendingQty((v) => v + 1)}
                disabled={addBusy}
                hitSlop={6}
                style={styles.stepBtn}
              >
                <Plus size={12} color={theme.colors.text} strokeWidth={2.5} />
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.78 }, addBusy && styles.addBtnDisabled]}
              onPress={handleAdd}
              disabled={addBusy}
            >
              {addBusy
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.addBtnText}>Add</Text>
              }
            </Pressable>
          </View>
        </View>
      )}

      <Pressable
        style={({ pressed }) => [styles.doneBtn, pressed && styles.doneBtnPressed]}
        onPress={onClose}
      >
        <Text style={styles.doneBtnText}>Done</Text>
      </Pressable>
    </BottomSheet>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: { gap: 3, marginBottom: theme.spacing.sm },
  title: { fontSize: 17, fontWeight: "800", color: theme.colors.text },
  subtitle: { fontSize: 13, color: theme.colors.textMuted },
  scroll: { maxHeight: 260 },
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
  stepper: { flexDirection: "row", alignItems: "center", gap: 5, flexShrink: 0 },
  stepBtn: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: theme.colors.neutralSoft,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: theme.colors.border,
  },
  stepBtnDisabled: { opacity: 0.35 },
  stepVal: { fontSize: 14, fontWeight: "700", color: theme.colors.text, minWidth: 20, textAlign: "center" },
  deleteBtn: {
    width: 32, height: 32, borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.dangerSoft,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  deleteBtnPressed: { opacity: 0.65 },
  emptyText: { fontSize: 13, color: theme.colors.textLight, fontStyle: "italic", paddingVertical: theme.spacing.sm, textAlign: "center" },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: theme.spacing.sm },
  addSection: { marginBottom: theme.spacing.sm },
  addRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  typePickerWrapper: { flex: 1, position: "relative", zIndex: 10 },
  typePicker: {
    flexDirection: "row", alignItems: "center", gap: 6, height: 44,
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.sm, backgroundColor: theme.colors.background,
  },
  typePickerOpen: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySoft },
  typePickerPressed: { opacity: 0.75 },
  typePickerText: { flex: 1, fontSize: 13, color: theme.colors.text },
  addBtn: {
    height: 44, paddingHorizontal: theme.spacing.md, borderRadius: theme.radius.md,
    alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primary, minWidth: 60,
  },
  addBtnDisabled: { opacity: 0.6 },
  addBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  allAddedText: { fontSize: 13, color: theme.colors.textLight, fontStyle: "italic", textAlign: "center", paddingVertical: theme.spacing.sm, marginBottom: theme.spacing.sm },
  inlinePicker: {
    position: "absolute", bottom: 46, left: 0, right: 0,
    zIndex: 100, elevation: 20, maxHeight: 220,
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.charcoal, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8,
  },
  inlinePickerOption: {
    flexDirection: "row", alignItems: "center", gap: theme.spacing.sm,
    paddingVertical: 11, paddingHorizontal: theme.spacing.sm,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  inlinePickerOptionSelected: { backgroundColor: theme.colors.primarySoft },
  inlinePickerOptionPressed: { opacity: 0.7 },
  inlinePickerIcon: { width: 22, alignItems: "center" },
  inlinePickerLabel: { flex: 1, fontSize: 14, color: theme.colors.text },
  inlinePickerLabelSelected: { color: theme.colors.primary, fontWeight: "600" },
  doneBtn: {
    height: 48, borderRadius: theme.radius.pill, alignItems: "center", justifyContent: "center",
    backgroundColor: theme.colors.neutralSoft, borderWidth: 1, borderColor: theme.colors.border, marginTop: theme.spacing.xs,
  },
  doneBtnPressed: { opacity: 0.7 },
  doneBtnText: { fontSize: 15, fontWeight: "700", color: theme.colors.textMuted },
});

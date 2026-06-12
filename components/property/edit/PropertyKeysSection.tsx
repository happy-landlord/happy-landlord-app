import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  Check,
  ChevronDown,
  ChevronUp,
  KeyRound,
  Minus,
  Plus,
  Trash2,
} from "lucide-react-native";

import { KEY_TYPE_ICON, KEY_TYPE_LABEL, theme } from "@/constants";
import { getKeyName } from "@/lib/utils";
import type { KeyType } from "@/types";
import type { DisplayKey } from "./usePropertyEditForm";

// ── Key type options ──────────────────────────────────────────────────────────

const ALL_KEY_TYPE_OPTIONS = (Object.keys(KEY_TYPE_LABEL) as KeyType[]).map((type) => {
  const Icon = KEY_TYPE_ICON[type] ?? KeyRound;
  return {
    value: type,
    label: KEY_TYPE_LABEL[type],
    icon: <Icon size={16} color={theme.colors.textMuted} strokeWidth={1.8} />,
  };
});

// ── Props ─────────────────────────────────────────────────────────────────────

export type PropertyKeysSectionProps = {
  displayKeys: DisplayKey[];
  totalKeys: number;
  onChangeQty: (key: DisplayKey, delta: number) => void;
  onDelete: (key: DisplayKey) => void;
  onAdd: (type: KeyType, qty: number, code: string | null) => void;
};

// ── Component ─────────────────────────────────────────────────────────────────

export function PropertyKeysSection({
  displayKeys,
  totalKeys,
  onChangeQty,
  onDelete,
  onAdd,
}: PropertyKeysSectionProps) {
  const [pendingType, setPendingType] = useState<KeyType>("main_door");
  const [pendingQty, setPendingQty] = useState(1);
  const [pendingCode, setPendingCode] = useState("");
  const [typePickerOpen, setTypePickerOpen] = useState(false);

  function handleAdd() {
    if (pendingQty < 1) return;
    setTypePickerOpen(false);
    onAdd(pendingType, pendingQty, pendingCode.trim() || null);
    setPendingQty(1);
    setPendingCode("");
  }

  return (
    <View style={styles.keysCard}>
      {/* Header */}
      <View style={styles.keysCardHeader}>
        <Text style={styles.keysCardTitle}>Keys Received</Text>
        <Text style={styles.totalCount}>
          {totalKeys} {totalKeys === 1 ? "key" : "keys"}
        </Text>
      </View>

      {displayKeys.length === 0 && (
        <Text style={styles.emptyText}>No keys yet. Add one below.</Text>
      )}

      {/* Key rows */}
      {displayKeys.map((k) => {
        const Icon = KEY_TYPE_ICON[k.key_type as KeyType] ?? KeyRound;
        const label = k.isNew ? k.label : getKeyName(k);
        const qty = k.quantity;
        return (
          <View key={k.id} style={[styles.keyRow, k.isNew && styles.keyRowNew]}>
            <Icon size={15} color={theme.colors.accent} strokeWidth={1.8} />
            <View style={styles.keyInfo}>
              <Text style={styles.keyLabel} numberOfLines={1}>{label}</Text>
              {k.code ? <Text style={styles.keyCode}>{k.code}</Text> : null}
            </View>
            {!k.isNew && k.keySetName && (
              <View style={styles.keySetNameBadge}>
                <Text style={styles.keySetNameBadgeText} numberOfLines={1}>
                  {k.keySetName}
                </Text>
              </View>
            )}
            {k.isNew && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>new</Text>
              </View>
            )}
            <View style={styles.stepper}>
              <Pressable
                onPress={() => onChangeQty(k, -1)}
                disabled={qty <= 1}
                hitSlop={6}
                style={[styles.stepBtn, qty <= 1 && styles.stepBtnDisabled]}
              >
                <Minus
                  size={11}
                  color={qty <= 1 ? theme.colors.textLight : theme.colors.text}
                  strokeWidth={2.5}
                />
              </Pressable>
              <Text style={styles.stepVal}>{qty}</Text>
              <Pressable onPress={() => onChangeQty(k, +1)} hitSlop={6} style={styles.stepBtn}>
                <Plus size={11} color={theme.colors.text} strokeWidth={2.5} />
              </Pressable>
            </View>
            <Pressable
              onPress={() => onDelete(k)}
              hitSlop={8}
              style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.65 }]}
            >
              <Trash2 size={14} color={theme.colors.danger} strokeWidth={2} />
            </Pressable>
          </View>
        );
      })}

      <View style={styles.cardDivider} />

      {/* Add row */}
      <View style={styles.addKeyRow}>
        <View style={styles.typePickerWrapper}>
          <Pressable
            style={({ pressed }) => [
              styles.typePicker,
              typePickerOpen && styles.typePickerOpen,
              pressed && { opacity: 0.75 },
            ]}
            onPress={() => setTypePickerOpen((v) => !v)}
          >
            {(() => {
              const Icon = KEY_TYPE_ICON[pendingType] ?? KeyRound;
              return <Icon size={14} color={theme.colors.textMuted} strokeWidth={1.8} />;
            })()}
            <Text style={styles.typePickerText} numberOfLines={1}>
              {KEY_TYPE_LABEL[pendingType]}
            </Text>
            {typePickerOpen ? (
              <ChevronUp size={13} color={theme.colors.textMuted} strokeWidth={2} />
            ) : (
              <ChevronDown size={13} color={theme.colors.textMuted} strokeWidth={2} />
            )}
          </Pressable>
          {typePickerOpen && (
            <ScrollView
              style={styles.inlinePicker}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
              nestedScrollEnabled
            >
              {ALL_KEY_TYPE_OPTIONS.map((opt) => {
                const selected = opt.value === pendingType;
                return (
                  <Pressable
                    key={opt.value}
                    style={({ pressed }) => [
                      styles.inlinePickerOption,
                      selected && styles.inlinePickerOptionSelected,
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => {
                      setPendingType(opt.value as KeyType);
                      setTypePickerOpen(false);
                    }}
                  >
                    <View style={styles.inlinePickerIcon}>{opt.icon}</View>
                    <Text
                      style={[
                        styles.inlinePickerLabel,
                        selected && styles.inlinePickerLabelSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {selected && (
                      <Check size={13} color={theme.colors.accent} strokeWidth={2.5} />
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
            disabled={pendingQty <= 1}
            hitSlop={6}
            style={[styles.stepBtn, pendingQty <= 1 && styles.stepBtnDisabled]}
          >
            <Minus
              size={11}
              color={pendingQty <= 1 ? theme.colors.textLight : theme.colors.text}
              strokeWidth={2.5}
            />
          </Pressable>
          <Text style={styles.stepVal}>{pendingQty}</Text>
          <Pressable
            onPress={() => setPendingQty((v) => v + 1)}
            hitSlop={6}
            style={styles.stepBtn}
          >
            <Plus size={11} color={theme.colors.text} strokeWidth={2.5} />
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [styles.addKeyBtn, pressed && { opacity: 0.78 }]}
          onPress={handleAdd}
        >
          <Text style={styles.addKeyBtnText}>Add</Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.codeInput}
        value={pendingCode}
        onChangeText={setPendingCode}
        placeholder="Code / tag # (optional)"
        placeholderTextColor={theme.colors.textLight}
        returnKeyType="done"
        maxLength={30}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  keysCard: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.accentSoft,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  keysCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  keysCardTitle: { fontSize: 15, fontWeight: "700", color: theme.colors.accent },
  totalCount: { fontSize: 13, fontWeight: "600", color: theme.colors.textMuted },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textLight,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: theme.spacing.xs,
  },
  cardDivider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 2 },
  keyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
  },
  keyRowNew: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: theme.colors.accentLight,
    backgroundColor: theme.colors.accentSoft,
  },
  newBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accent,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: theme.colors.textInverse,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  keyInfo: { flex: 1, gap: 2, minWidth: 0 },
  keyLabel: { fontSize: 13, fontWeight: "600", color: theme.colors.text },
  keyCode: { fontSize: 11, color: theme.colors.textMuted },
  keySetNameBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1,
    borderColor: theme.colors.accent + "44",
    maxWidth: 80,
    flexShrink: 1,
  },
  keySetNameBadgeText: { fontSize: 10, fontWeight: "700", color: theme.colors.accent },
  stepper: { flexDirection: "row", alignItems: "center", gap: 5, flexShrink: 0 },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.neutralSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnDisabled: { opacity: 0.35 },
  stepVal: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text,
    minWidth: 20,
    textAlign: "center",
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  addKeyRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  typePickerWrapper: { flex: 1, position: "relative", zIndex: 10 },
  typePicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 40,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  typePickerOpen: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
  typePickerText: { flex: 1, fontSize: 13, color: theme.colors.text },
  inlinePicker: {
    position: "absolute",
    bottom: 42,
    left: 0,
    right: 0,
    zIndex: 100,
    elevation: 20,
    maxHeight: 220,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  inlinePickerOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: 11,
    paddingHorizontal: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  inlinePickerOptionSelected: { backgroundColor: theme.colors.accentSoft },
  inlinePickerIcon: { width: 22, alignItems: "center" },
  inlinePickerLabel: { flex: 1, fontSize: 14, color: theme.colors.text },
  inlinePickerLabelSelected: { color: theme.colors.accent, fontWeight: "600" },
  addKeyBtn: {
    height: 40,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.accent,
    minWidth: 60,
  },
  addKeyBtnText: { fontSize: 14, fontWeight: "700", color: theme.colors.textInverse },
  codeInput: {
    height: 40,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.sm,
    fontSize: 13,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
  },
});


import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Plus, Trash2 } from "lucide-react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";

import { KEY_TYPE_ICON, KEY_TYPE_LABEL, theme } from "@/constants";
import { Input, OutlinedSelect, PickerModal } from "@/components/ui";
import type { KeyType } from "@/types";
import type { DisplayKey } from "./usePropertyEditForm";

// ── Options ───────────────────────────────────────────────────────────────────

const KEY_TYPE_OPTIONS = (Object.keys(KEY_TYPE_LABEL) as KeyType[]).map((type) => {
  const Icon = KEY_TYPE_ICON[type];
  return {
    value: type,
    label: KEY_TYPE_LABEL[type],
    icon: Icon ? <Icon size={16} color={theme.colors.textMuted} strokeWidth={1.8} /> : undefined,
  };
});

const QTY_OPTIONS = Array.from({ length: 6 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

// ── Types ─────────────────────────────────────────────────────────────────────

type DraftKey = {
  id: string;
  type: KeyType;
  count: number;
  code: string | null;
  otherLabel: string | null;
};

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
  const [drafts, setDrafts] = useState<DraftKey[]>([]);
  const [activeTypePickerFor, setActiveTypePickerFor] = useState<string | null>(null);
  const [activeQtyPickerFor, setActiveQtyPickerFor] = useState<string | null>(null);

  function addDraft() {
    setDrafts((prev) => [
      ...prev,
      { id: `draft-${Date.now()}`, type: KEY_TYPE_OPTIONS[0].value as KeyType, count: 1, code: null, otherLabel: null },
    ]);
  }

  function updateDraft(id: string, patch: Partial<DraftKey>) {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  function commitDraft(draft: DraftKey) {
    onAdd(draft.type, draft.count, draft.code);
    setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
  }

  // Picker resolution
  const activeQtyDisplayKey = displayKeys.find((k) => k.id === activeQtyPickerFor);
  const activeQtyDraft = drafts.find((d) => d.id === activeQtyPickerFor);
  const activeQtyValue = String(activeQtyDisplayKey?.quantity ?? activeQtyDraft?.count ?? 1);
  const activeTypeDraft = drafts.find((d) => d.id === activeTypePickerFor);

  function handleQtySelect(v: string) {
    const newQty = Number(v);
    if (activeQtyDisplayKey) onChangeQty(activeQtyDisplayKey, newQty - activeQtyDisplayKey.quantity);
    else if (activeQtyDraft) updateDraft(activeQtyDraft.id, { count: newQty });
  }

  const totalDisplay = totalKeys + drafts.reduce((s, d) => s + d.count, 0);

  return (
    <View style={styles.keysSection}>
      {/* Header */}
      <View style={styles.keysHeader}>
        <Text style={styles.sectionGroupTitle}>Keys Received</Text>
        {totalDisplay > 0 && (
          <Text style={styles.totalCount}>
            {totalDisplay} {totalDisplay === 1 ? "key" : "keys"}
          </Text>
        )}
      </View>

      {/* Existing / already-committed keys */}
      {displayKeys.map((entry) => {
        const keySetName = !entry.isNew
          ? (entry as DisplayKey & { keySetName?: string | null }).keySetName ?? null
          : null;
        const inKeyset = Boolean(keySetName);
        const typeLabel = KEY_TYPE_LABEL[entry.key_type as KeyType] ?? entry.key_type;
        const isOther = entry.key_type === "other";
        const otherLabel = isOther ? (entry as { label?: string }).label ?? null : null;

        const card = (
          <View style={styles.keyFormCard}>
            <View style={styles.keyFormRow}>
              <OutlinedSelect
                value={typeLabel}
                disabled={inKeyset}
                onPress={() => {}}
                style={styles.keyTypeField}
                labelBackground={theme.colors.surface}
              />
              <Input
                placeholder="Code #"
                value={entry.code ?? ""}
                editable={!inKeyset}
                onChangeText={() => {}}
                containerStyle={styles.keyCodeField}
                labelBackground={theme.colors.surface}
              />
              <OutlinedSelect
                value={String(entry.quantity)}
                focused={activeQtyPickerFor === entry.id}
                disabled={inKeyset}
                onPress={() => !inKeyset && setActiveQtyPickerFor(entry.id)}
                style={styles.keyQtyField}
                labelBackground={theme.colors.surface}
              />
            </View>
            {isOther && otherLabel ? (
              <Input
                placeholder="Key label"
                value={otherLabel}
                editable={!inKeyset}
                onChangeText={() => {}}
                containerStyle={styles.keyOtherField}
                labelBackground={theme.colors.surface}
              />
            ) : null}
            {inKeyset && (
              <View style={styles.keysetBadge}>
                <Text style={styles.keysetBadgeText} numberOfLines={1}>
                  Keyset: {keySetName}
                </Text>
              </View>
            )}
          </View>
        );

        if (inKeyset) return <View key={entry.id}>{card}</View>;

        return (
          <ReanimatedSwipeable
            key={entry.id}
            renderRightActions={() => (
              <Pressable style={styles.swipeDeleteAction} onPress={() => onDelete(entry)}>
                <Trash2 size={18} color="#fff" strokeWidth={1.8} />
                <Text style={styles.swipeDeleteText}>Remove</Text>
              </Pressable>
            )}
            rightThreshold={40}
            overshootRight={false}
          >
            {card}
          </ReanimatedSwipeable>
        );
      })}

      {/* Draft (new) key cards */}
      {drafts.map((draft) => (
        <ReanimatedSwipeable
          key={draft.id}
          renderRightActions={() => (
            <Pressable style={styles.swipeDeleteAction} onPress={() => setDrafts((p) => p.filter((d) => d.id !== draft.id))}>
              <Trash2 size={18} color="#fff" strokeWidth={1.8} />
              <Text style={styles.swipeDeleteText}>Remove</Text>
            </Pressable>
          )}
          rightThreshold={40}
          overshootRight={false}
        >
          <View style={[styles.keyFormCard, styles.keyFormCardDraft]}>
            <View style={styles.keyFormRow}>
              <OutlinedSelect
                value={KEY_TYPE_LABEL[draft.type]}
                focused={activeTypePickerFor === draft.id}
                onPress={() => setActiveTypePickerFor(draft.id)}
                style={styles.keyTypeField}
                labelBackground={theme.colors.surface}
              />
              <Input
                placeholder="Code #"
                value={draft.code ?? ""}
                onChangeText={(v) => updateDraft(draft.id, { code: v.trim() || null })}
                autoCapitalize="characters"
                maxLength={30}
                containerStyle={styles.keyCodeField}
                labelBackground={theme.colors.surface}
              />
              <OutlinedSelect
                value={String(draft.count)}
                focused={activeQtyPickerFor === draft.id}
                onPress={() => setActiveQtyPickerFor(draft.id)}
                style={styles.keyQtyField}
                labelBackground={theme.colors.surface}
              />
            </View>
            {draft.type === "other" && (
              <Input
                placeholder="Key label"
                value={draft.otherLabel ?? ""}
                onChangeText={(v) => updateDraft(draft.id, { otherLabel: v || null })}
                maxLength={40}
                containerStyle={styles.keyOtherField}
                labelBackground={theme.colors.surface}
              />
            )}
            <Pressable
              style={({ pressed }) => [styles.confirmBtn, pressed && { opacity: 0.75 }]}
              onPress={() => commitDraft(draft)}
            >
              <Text style={styles.confirmBtnText}>+ Add key</Text>
            </Pressable>
          </View>
        </ReanimatedSwipeable>
      ))}

      {/* Dotted Add Key button */}
      <Pressable
        style={({ pressed }) => [styles.addKeyDotBtn, pressed && { opacity: 0.7 }]}
        onPress={addDraft}
      >
        <Plus size={16} color={theme.colors.accent} strokeWidth={2.2} />
        <Text style={styles.addKeyDotBtnText}>Add Key</Text>
      </Pressable>

      {/* Shared pickers */}
      <PickerModal
        visible={activeTypePickerFor !== null}
        title="Key Type"
        options={KEY_TYPE_OPTIONS}
        value={activeTypeDraft?.type ?? KEY_TYPE_OPTIONS[0].value}
        onSelect={(v) => {
          if (activeTypeDraft) updateDraft(activeTypeDraft.id, { type: v as KeyType, otherLabel: null });
        }}
        onClose={() => setActiveTypePickerFor(null)}
      />
      <PickerModal
        visible={activeQtyPickerFor !== null}
        title="Quantity"
        options={QTY_OPTIONS}
        value={activeQtyValue}
        onSelect={handleQtySelect}
        onClose={() => setActiveQtyPickerFor(null)}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  keysSection: {
    gap: theme.spacing.sm,
  },
  keysHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionGroupTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: theme.spacing.xs,
  },
  totalCount: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  keyFormCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  keyFormCardDraft: {
    borderColor: theme.colors.accentLight,
    borderStyle: "dashed",
  },
  keyFormRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  keyTypeField: { flex: 2, marginTop: 0 },
  keyCodeField: { flex: 2, marginTop: 0 },
  keyQtyField: { width: 72, marginTop: 0 },
  keyOtherField: { marginTop: 0 },
  keysetBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.neutralSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  keysetBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  confirmBtn: {
    alignSelf: "flex-end",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accent,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.textInverse,
  },
  swipeDeleteAction: {
    backgroundColor: theme.colors.danger,
    borderRadius: theme.radius.lg,
    marginLeft: theme.spacing.sm,
    width: 76,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
  },
  swipeDeleteText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  addKeyDotBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    height: 46,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: theme.colors.accentLight,
    backgroundColor: theme.colors.accentSoft,
  },
  addKeyDotBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.accent,
  },
});


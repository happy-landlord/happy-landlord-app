import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyRound, Plus, Trash2 } from "lucide-react-native";

import { theme } from "@/constants/theme";
import { PhotoPicker } from "@/components/ui/PhotoPicker";
import { PrintButton } from "@/components/ui/PrintButton";
import { KEY_TYPE_ICON, KEY_TYPE_LABEL } from "@/components/key/keyLabels";
import { buildQrPrintPage } from "@/lib/utils/print";
import { buildKeySetCode, type KeyEntry, type KeySetDraft } from "./types";

// ── Helpers ───────────────────────────────────────────────────────────────────


function keyLabel(entry: KeyEntry): string {
  if (entry.type === "other" && entry.otherLabel) return entry.otherLabel;
  return KEY_TYPE_LABEL[entry.type] ?? entry.type;
}

// ── KeysStep ──────────────────────────────────────────────────────────────────

type Props = {
  keySets: KeySetDraft[];
  keys: KeyEntry[];
  propertyCode: string | null;
  codeLoading: boolean;
  onChange: (keySets: KeySetDraft[]) => void;
};

export function KeysStep({ keySets, keys, propertyCode, codeLoading, onChange }: Props) {
  const [selectedKeyIds, setSelectedKeyIds] = useState<string[]>([]);
  const [pendingName, setPendingName] = useState("Set 1");

  // How many times each key has already been allocated across existing keysets
  const allocatedCounts: Record<string, number> = {};
  for (const ks of keySets) {
    for (const kid of ks.keyIds) {
      allocatedCounts[kid] = (allocatedCounts[kid] ?? 0) + 1;
    }
  }

  // Remaining = total count minus already allocated
  function remaining(entry: { id: string; count: number }) {
    return entry.count - (allocatedCounts[entry.id] ?? 0);
  }

  function toggleKey(id: string) {
    setSelectedKeyIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function addKeySet() {
    if (selectedKeyIds.length === 0) return;
    const newSet: KeySetDraft = {
      id: `ks-${Date.now()}`,
      name: pendingName.trim() || `Set ${keySets.length + 1}`,
      photoUris: [],
      keyIds: [...selectedKeyIds],
    };
    onChange([...keySets, newSet]);
    setSelectedKeyIds([]);
    setPendingName(`Set ${keySets.length + 2}`);
  }

  function updateKeySet(id: string, patch: Partial<KeySetDraft>) {
    onChange(keySets.map((ks) => (ks.id === id ? { ...ks, ...patch } : ks)));
  }

  function removeKeySet(id: string) {
    onChange(keySets.filter((ks) => ks.id !== id));
  }

  const canAdd = selectedKeyIds.length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.subheading}>
        Select which keys to include in a keyset, give it a name, then tap Add.
        Keys are distributed across keysets — count shows remaining copies.
      </Text>

      {/* ── Key selector ─────────────────────────────────────────────────── */}
      {keys.length === 0 ? (
        <View style={styles.emptyKeys}>
          <KeyRound size={18} color={theme.colors.textLight} strokeWidth={1.8} />
          <Text style={styles.emptyKeysText}>
            No keys defined. Go back and add keys first.
          </Text>
        </View>
      ) : (
        <View style={styles.selectorCard}>
          <Text style={styles.selectorLabel}>Keys to include</Text>
          <View style={styles.keyPillGrid}>
            {keys.map((entry) => {
              const Icon = KEY_TYPE_ICON[entry.type] ?? KeyRound;
              const selected = selectedKeyIds.includes(entry.id);
              const rem = remaining(entry);
              const disabled = rem <= 0 && !selected;
              return (
                <Pressable
                  key={entry.id}
                  style={[
                    styles.keyPill,
                    selected && styles.keyPillSelected,
                    disabled && styles.keyPillDisabled,
                  ]}
                  onPress={() => !disabled && toggleKey(entry.id)}
                  disabled={disabled}
                >
                  <Icon
                    size={13}
                    color={
                      disabled
                        ? theme.colors.textLight
                        : selected
                        ? theme.colors.primary
                        : theme.colors.textMuted
                    }
                    strokeWidth={1.8}
                  />
                  <Text
                    style={[
                      styles.keyPillLabel,
                      selected && styles.keyPillLabelSelected,
                      disabled && styles.keyPillLabelDisabled,
                    ]}
                    numberOfLines={1}
                  >
                    {keyLabel(entry)}
                  </Text>
                  {entry.count > 1 && (
                    <View style={[
                      styles.countDot,
                      selected && styles.countDotSelected,
                      disabled && styles.countDotExhausted,
                    ]}>
                      <Text style={[
                        styles.countDotText,
                        selected && styles.countDotTextSelected,
                      ]}>
                        {rem}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Name + Add row */}
          <View style={styles.addRow}>
            <TextInput
              style={styles.nameInput}
              value={pendingName}
              onChangeText={setPendingName}
              placeholder="Keyset name"
              placeholderTextColor={theme.colors.textLight}
              selectionColor={theme.colors.primary}
              returnKeyType="done"
              maxLength={40}
            />
            <Pressable
              style={({ pressed }) => [
                styles.addBtn,
                !canAdd && styles.addBtnDisabled,
                pressed && canAdd && { opacity: 0.78 },
              ]}
              onPress={addKeySet}
              disabled={!canAdd}
            >
              <Plus size={15} color="#fff" strokeWidth={2.5} />
              <Text style={styles.addBtnText}>Add</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── Created keysets ───────────────────────────────────────────────── */}
      {keySets.length > 0 && (
        <>
          <Text style={styles.createdLabel}>
            {keySets.length} keyset{keySets.length === 1 ? "" : "s"} created
          </Text>
          {keySets.map((draft, index) => (
            <KeySetDraftCard
              key={draft.id}
              draft={draft}
              keys={keys}
              code={buildKeySetCode(propertyCode, index, keySets.length)}
              codeLoading={codeLoading}
              onUpdate={(patch) => updateKeySet(draft.id, patch)}
              onDelete={() => removeKeySet(draft.id)}
            />
          ))}
        </>
      )}
    </View>
  );
}

// ── KeySetDraftCard ───────────────────────────────────────────────────────────

type CardProps = {
  draft: KeySetDraft;
  keys: KeyEntry[];
  code: string | null;
  codeLoading: boolean;
  onUpdate: (patch: Partial<KeySetDraft>) => void;
  onDelete: () => void;
};

function KeySetDraftCard({ draft, keys, code, codeLoading, onUpdate, onDelete }: CardProps) {
  const draftKeys = keys.filter((k) => draft.keyIds.includes(k.id));

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <TextInput
          style={styles.cardNameInput}
          value={draft.name}
          onChangeText={(name) => onUpdate({ name })}
          placeholder="Keyset name"
          placeholderTextColor={theme.colors.textLight}
          selectionColor={theme.colors.primary}
          returnKeyType="done"
          maxLength={40}
        />
        <PrintButton
          variant="pill"
          label="Print QR"
          disabled={!code || codeLoading}
          buildHtml={code ? () => buildQrPrintPage({ code, title: draft.name }) : undefined}
        />
        <Pressable
          onPress={onDelete}
          hitSlop={8}
          style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel="Remove keyset"
        >
          <Trash2 size={16} color={theme.colors.danger} strokeWidth={2} />
        </Pressable>
      </View>

      {/* Keys in this set */}
      {draftKeys.length > 0 && (
        <View style={styles.cardKeyPillGrid}>
          {draftKeys.map((entry) => {
            const Icon = KEY_TYPE_ICON[entry.type] ?? KeyRound;
            return (
              <View key={entry.id} style={styles.cardKeyPill}>
                <Icon size={12} color={theme.colors.primary} strokeWidth={1.8} />
                <Text style={styles.cardKeyPillLabel} numberOfLines={1}>
                  {keyLabel(entry)}
                </Text>
              </View>
            );
          })}
        </View>
      )}


      <View style={styles.photoSection}>
        <PhotoPicker
          uris={draft.photoUris}
          onChange={(photoUris) => onUpdate({ photoUris })}
          color={theme.colors.primary}
          label="Keyset Photos"
          hint="Tap to add photos of the keyset"
          gridInset={theme.spacing.md * 2 + 5}
          compact
        />
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  subheading: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: -theme.spacing.sm,
    lineHeight: 20,
  },
  emptyKeys: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  emptyKeysText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textLight,
  },
  selectorCard: {
    borderWidth: 1.5,
    borderColor: theme.colors.primarySoft,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  selectorLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  keyPillGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  keyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 7,
    borderRadius: theme.radius.pill,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  keyPillSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  keyPillDisabled: {
    opacity: 0.4,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.neutralSoft,
  },
  keyPillLabel: {
    maxWidth: 110,
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  keyPillLabelSelected: {
    color: theme.colors.primary,
    fontWeight: "700",
  },
  keyPillLabelDisabled: {
    color: theme.colors.textLight,
  },
  countDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.neutralSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  countDotSelected: { backgroundColor: theme.colors.primary },
  countDotExhausted: { backgroundColor: theme.colors.neutralSoft },
  countDotText: { fontSize: 10, fontWeight: "800", color: theme.colors.textMuted },
  countDotTextSelected: { color: "#fff" },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginTop: 4,
  },
  nameInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.sm,
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 40,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
  },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  createdLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.textMuted,
    marginBottom: -4,
  },
  card: {
    borderWidth: 1.5,
    borderColor: theme.colors.primarySoft,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  cardNameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.primary,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.dangerSoft,
  },
  cardKeyPillGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  cardKeyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  cardKeyPillLabel: {
    maxWidth: 100,
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.text,
  },
  photoSection: {
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});

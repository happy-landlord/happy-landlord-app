import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { KeyRound, Plus, Trash2 } from "lucide-react-native";

import { KEY_TYPE_ICON, theme } from "@/constants";
import { Input, PhotoPicker, ShareQrButton } from "@/components/ui";
import { buildKeySetCode, countAllocatedKeys, getDraftKeyLabel, keySetQrUrl } from "@/lib/utils";
import type { KeyEntry, KeySetDraft } from "./useAddPropertyWizard";

// ── KeySetsStep ──────────────────────────────────────────────────────────────

type Props = {
  keySets: KeySetDraft[];
  keys: KeyEntry[];
  propertyCode: string | null;
  codeLoading: boolean;
  onChange: (keySets: KeySetDraft[]) => void;
};

export function KeySetsStep({
  keySets,
  keys,
  propertyCode,
  codeLoading,
  onChange,
}: Props) {
  // Total allocated across ALL keysets, per KeyEntry id
  const allocatedCounts = countAllocatedKeys(keySets);
  function remaining(entry: KeyEntry) {
    return entry.count - (allocatedCounts[entry.id] ?? 0);
  }

  function addKeySet() {
    const newSet: KeySetDraft = {
      id: `ks-${Date.now()}`,
      name: `Set ${keySets.length + 1}`,
      photoUris: [],
      keyIds: [],
      cabinetSlot: null,
    };
    onChange([...keySets, newSet]);
  }

  function updateKeySet(id: string, patch: Partial<KeySetDraft>) {
    onChange(keySets.map((ks) => (ks.id === id ? { ...ks, ...patch } : ks)));
  }

  function removeKeySet(id: string) {
    onChange(keySets.filter((ks) => ks.id !== id));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.subheading}>
        Create keysets and assign inventory keys. Counts show remaining copies.
      </Text>

      {keys.length === 0 ? (
        <View style={styles.emptyKeys}>
          <KeyRound
            size={18}
            color={theme.colors.textLight}
            strokeWidth={1.8}
          />
          <Text style={styles.emptyKeysText}>
            No keys defined. Go back and add keys first.
          </Text>
        </View>
      ) : (
        <>
          {keySets.length > 0 && (
            <Text style={styles.createdLabel}>
              {keySets.length} keyset{keySets.length === 1 ? "" : "s"}
            </Text>
          )}

          {keySets.map((draft, index) => (
            <KeySetDraftCard
              key={draft.id}
              draft={draft}
              keys={keys}
              code={(() => {
                const c = buildKeySetCode(propertyCode, index, keySets.length);
                return c ? keySetQrUrl(c) : null;
              })()}
              codeLoading={codeLoading}
              remaining={remaining}
              onUpdate={(patch) => updateKeySet(draft.id, patch)}
              onDelete={() => removeKeySet(draft.id)}
            />
          ))}

          <Pressable
            onPress={addKeySet}
            style={({ pressed }) => [
              styles.newSetBtn,
              pressed && { opacity: 0.78 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Add new keyset"
          >
            <Plus size={16} color={theme.colors.accent} strokeWidth={2.5} />
            <Text style={styles.newSetBtnText}>New keyset</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

// ── KeySetDraftCard ──────────────────────────────────────────────────────────

type CardProps = {
  draft: KeySetDraft;
  keys: KeyEntry[];
  code: string | null;
  codeLoading: boolean;
  remaining: (entry: KeyEntry) => number;
  onUpdate: (patch: Partial<KeySetDraft>) => void;
  onDelete: () => void;
};

function KeySetDraftCard({
  draft,
  keys,
  code,
  codeLoading,
  remaining,
  onUpdate,
  onDelete,
}: CardProps) {
  // Count how many of each KeyEntry are assigned to THIS draft
  const assignedCounts: Record<string, number> = {};
  for (const kid of draft.keyIds) {
    assignedCounts[kid] = (assignedCounts[kid] ?? 0) + 1;
  }
  const assignedEntries = keys.filter((k) => (assignedCounts[k.id] ?? 0) > 0);
  const availableEntries = keys.filter((k) => remaining(k) > 0);

  function assignOne(entryId: string) {
    onUpdate({ keyIds: [...draft.keyIds, entryId] });
  }
  function unassignOne(entryId: string) {
    const idx = draft.keyIds.lastIndexOf(entryId);
    if (idx < 0) return;
    const next = [...draft.keyIds];
    next.splice(idx, 1);
    onUpdate({ keyIds: next });
  }

  return (
    <View style={styles.card}>
      {/* Header: name + print + delete */}
      <View style={styles.cardHeader}>
        <TextInput
          style={styles.cardNameInput}
          value={draft.name}
          onChangeText={(name) => onUpdate({ name })}
          placeholder="Keyset name"
          placeholderTextColor={theme.colors.textLight}
          selectionColor={theme.colors.text}
          returnKeyType="done"
          maxLength={40}
        />
        <ShareQrButton
          variant="pill"
          code={code ?? " "}
          title={draft.name}
          disabled={!code || codeLoading}
        />
        <Pressable
          onPress={onDelete}
          hitSlop={8}
          style={({ pressed }) => [
            styles.deleteBtn,
            pressed && { opacity: 0.6 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Remove keyset"
        >
          <Trash2 size={16} color={theme.colors.danger} strokeWidth={2} />
        </Pressable>
      </View>


      <View style={styles.divider} />

      {/* Assigned keys */}
      <Text style={styles.sectionLabel}>Assigned keys</Text>
      {assignedEntries.length > 0 ? (
        <View style={styles.assignedList}>
          {assignedEntries.map((entry) => {
            const Icon = KEY_TYPE_ICON[entry.type] ?? KeyRound;
            const qty = assignedCounts[entry.id] ?? 0;
            return (
              <Pressable
                key={entry.id}
                onPress={() => unassignOne(entry.id)}
                style={({ pressed }) => [
                  styles.keyRow,
                  styles.assignedKeyRow,
                  pressed && { opacity: 0.65 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Unassign one key"
              >
                <View style={[styles.keyIconCircle, styles.assignedKeyIconCircle]}>
                  <Icon
                    size={14}
                    color={theme.colors.surface}
                    strokeWidth={1.8}
                  />
                </View>
                <View style={styles.keyInfo}>
                  <Text style={styles.keyLabel} numberOfLines={1}>
                    {getDraftKeyLabel(entry)}
                  </Text>
                  {entry.code ? (
                    <View style={styles.codeChip}>
                      <Text style={styles.codeChipText}>{entry.code}</Text>
                    </View>
                  ) : null}
                </View>
                {qty > 1 && (
                  <View style={styles.qtyChip}>
                    <Text style={styles.qtyChipText}>{qty}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text style={styles.emptyText}>No keys assigned yet.</Text>
      )}

      {/* Available to assign */}
      {availableEntries.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Available to assign</Text>
          <View style={styles.assignedList}>
            {availableEntries.map((entry) => {
              const Icon = KEY_TYPE_ICON[entry.type] ?? KeyRound;
              const rem = remaining(entry);
              return (
                <Pressable
                  key={entry.id}
                  onPress={() => assignOne(entry.id)}
                  style={({ pressed }) => [styles.keyRow, pressed && { opacity: 0.65 }]}
                  accessibilityRole="button"
                  accessibilityLabel="Assign one key"
                >
                  <View style={styles.keyIconCircle}>
                    <Icon
                      size={14}
                      color={theme.colors.accent}
                      strokeWidth={1.8}
                    />
                  </View>
                  <View style={styles.keyInfo}>
                    <Text style={styles.keyLabel} numberOfLines={1}>
                      {getDraftKeyLabel(entry)}
                    </Text>
                    {entry.code ? (
                      <View style={styles.codeChip}>
                        <Text style={styles.codeChipText}>{entry.code}</Text>
                      </View>
                    ) : null}
                  </View>
                  {rem > 1 && (
                    <View style={styles.qtyChip}>
                      <Text style={styles.qtyChipText}>{rem}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {/* Photos */}
      <View style={styles.photoSection}>
        <PhotoPicker
          uris={draft.photoUris}
          onChange={(photoUris) => onUpdate({ photoUris })}
          color={theme.colors.accent}
          label="Keyset Photos"
          hint="Tap to add photos of the keyset"
          gridInset={theme.spacing.md * 2 + 5}
          compact
        />
      </View>

      {/* Cabinet Slot */}
      <Input
        label="Cabinet Slot"
        placeholder="e.g. A3"
        value={draft.cabinetSlot ?? ""}
        onChangeText={(v) => onUpdate({ cabinetSlot: v.trim() || null })}
        autoCapitalize="characters"
        maxLength={20}
        containerStyle={styles.cabinetSlotInput}
        labelBackground={theme.colors.surface}
      />
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

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
  createdLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.textMuted,
    marginBottom: -4,
  },

  // -- Card ----------------------------------------------------------------
  card: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
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
    color: theme.colors.text,
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
  cabinetSlotInput: {
    marginTop: theme.spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: theme.colors.textLight,
    marginBottom: theme.spacing.xs,
  },

  // -- Key rows (shared between assigned + available) ----------------------
  assignedList: { gap: 6 },
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
  assignedKeyRow: {
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1,
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
  assignedKeyIconCircle: {
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
  emptyText: {
    fontSize: 13,
    color: theme.colors.textLight,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: theme.spacing.sm,
  },

  // -- Photos --------------------------------------------------------------
  photoSection: {
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },

  // -- New keyset CTA ------------------------------------------------------
  newSetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 46,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: theme.colors.accentLight,
    backgroundColor: theme.colors.accentSoft,
  },
  newSetBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.accent,
  },
});

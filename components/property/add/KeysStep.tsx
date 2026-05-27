import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronDown, KeyRound, X } from "lucide-react-native";

import { theme } from "@/constants/theme";
import { PickerModal } from "@/components/ui/PickerModal";
import { PhotoPicker } from "@/components/ui/PhotoPicker";
import { KEY_TYPE_ICON, KEY_TYPE_LABEL } from "@/components/key/keyLabels";
import type { KeyEntry, KeyItemType } from "./types";

// ── Key type options ──────────────────────────────────────────────────────────

const KEY_TYPE_OPTIONS = (Object.keys(KEY_TYPE_LABEL) as KeyItemType[]).map(
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

type Props = {
  keys: KeyEntry[];
  photoUris: string[];
  onChange: (keys: KeyEntry[]) => void;
  onPhotoChange: (uris: string[]) => void;
};

export function KeysStep({ keys, photoUris, onChange, onPhotoChange }: Props) {
  const [pendingType, setPendingType] = useState<KeyItemType>(
    KEY_TYPE_OPTIONS[0].value,
  );
  const [pendingCount, setPendingCount] = useState(1);
  const [pickerOpen, setPickerOpen] = useState(false);

  // ── Derived ───────────────────────────────────────────────────────────────

  const usedTypes = new Set(keys.map((k) => k.type));
  const availableOptions = KEY_TYPE_OPTIONS.filter(
    (o) => !usedTypes.has(o.value),
  );
  const allTypesAdded = availableOptions.length === 0;
  const totalKeys = keys.reduce((sum, k) => sum + k.count, 0);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function addKey() {
    if (pendingCount < 1 || usedTypes.has(pendingType) || allTypesAdded) return;
    const entry: KeyEntry = {
      id: `key-${Date.now()}`,
      type: pendingType,
      count: pendingCount,
    };
    onChange([...keys, entry]);
    // Advance pendingType to next available option
    const nextAvailable = availableOptions.find((o) => o.value !== pendingType);
    setPendingType(nextAvailable?.value ?? KEY_TYPE_OPTIONS[0].value);
    setPendingCount(1);
  }

  function removeKey(id: string) {
    onChange(keys.filter((k) => k.id !== id));
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <Text style={styles.subheading}>
        Add each type of key received for this property.
      </Text>

      {/* ── Unified sub-form card ─────────────────────────────────────────── */}
      <View style={styles.subForm}>
        {/* Header: title + total badge */}
        <View style={styles.subFormHeader}>
          <Text style={styles.subFormTitle}>Keys</Text>
          <View style={styles.totalBadge}>
            <KeyRound size={12} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={styles.totalBadgeText}>
              {totalKeys} {totalKeys === 1 ? "Key" : "Keys"}
            </Text>
          </View>
        </View>

        {/* Added key entries */}
        {keys.length > 0 && (
          <View style={styles.keyList}>
            {keys.map((entry) => {
              const Icon = KEY_TYPE_ICON[entry.type] ?? KeyRound;
              return (
                <View key={entry.id} style={styles.keyEntry}>
                  <Icon size={15} color={theme.colors.primary} strokeWidth={1.8} />
                  <Text style={styles.keyEntryLabel} numberOfLines={1}>
                    {KEY_TYPE_LABEL[entry.type]}
                  </Text>
                  <Text style={styles.keyEntryCount}>× {entry.count}</Text>
                  <Pressable onPress={() => removeKey(entry.id)} hitSlop={8}>
                    <X size={16} color={theme.colors.danger} strokeWidth={2} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        {/* Divider */}
        <View style={styles.divider} />

        {/* Add-key row — hidden once all types added */}
        {allTypesAdded ? (
          <View style={styles.allAddedRow}>
            <Text style={styles.allAddedText}>
              All key types added.
            </Text>
          </View>
        ) : (
          <View style={styles.addKeyRow}>
            {/* Type picker */}
            <Pressable
              style={styles.keyTypePicker}
              onPress={() => setPickerOpen(true)}
            >
              {(() => {
                const Icon = KEY_TYPE_ICON[pendingType] ?? KeyRound;
                return (
                  <Icon size={15} color={theme.colors.textMuted} strokeWidth={1.8} />
                );
              })()}
              <Text style={styles.keyTypePickerText} numberOfLines={1}>
                {KEY_TYPE_LABEL[pendingType]}
              </Text>
              <ChevronDown size={14} color={theme.colors.textMuted} strokeWidth={2} />
            </Pressable>

            {/* Count stepper */}
            <View style={styles.counter}>
              <Pressable
                style={styles.counterBtn}
                onPress={() => setPendingCount((v) => Math.max(1, v - 1))}
              >
                <Text style={styles.counterBtnText}>−</Text>
              </Pressable>
              <Text style={styles.counterVal}>{pendingCount}</Text>
              <Pressable
                style={styles.counterBtn}
                onPress={() => setPendingCount((v) => v + 1)}
              >
                <Text style={styles.counterBtnText}>+</Text>
              </Pressable>
            </View>

            {/* Add button */}
            <Pressable
              style={({ pressed }) => [
                styles.addKeyBtn,
                pressed && { opacity: 0.78 },
              ]}
              onPress={addKey}
            >
              <Text style={styles.addKeyBtnText}>Add</Text>
            </Pressable>
          </View>
        )}

        {/* Photos */}
        <View style={styles.photoSection}>
          <PhotoPicker
            uris={photoUris}
            onChange={onPhotoChange}
            color={theme.colors.primary}
            label="Photos"
            hint="Tap to add photos of the keys"
            gridInset={theme.spacing.md * 2 + 5}
            compact
          />
        </View>
      </View>

      {/* Prompt when no keys and nothing selected */}
      {keys.length === 0 && !allTypesAdded && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            Use the form above to add key types.
          </Text>
        </View>
      )}

      {/* Key type picker modal */}
      <PickerModal
        visible={pickerOpen}
        title="Key Type"
        options={availableOptions}
        value={pendingType}
        onSelect={(v) => setPendingType(v as KeyItemType)}
        onClose={() => setPickerOpen(false)}
      />
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
  },

  // ── Sub-form card ─────────────────────────────────────────────────────────
  subForm: {
    borderWidth: 1.5,
    borderColor: theme.colors.primarySoft,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  subFormHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  subFormTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  totalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySoft,
  },
  totalBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.primary,
  },

  // ── Key entries ───────────────────────────────────────────────────────────
  keyList: { gap: 6 },
  keyEntry: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
    gap: theme.spacing.sm,
  },
  keyEntryLabel: { flex: 1, fontSize: 14, color: theme.colors.text },
  keyEntryCount: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textMuted,
    minWidth: 32,
    textAlign: "right",
  },

  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 2,
  },

  // ── Add-key row ───────────────────────────────────────────────────────────
  addKeyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  keyTypePicker: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    height: 40,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  keyTypePickerText: { flex: 1, fontSize: 13, color: theme.colors.text },
  counter: { flexDirection: "row", alignItems: "center", gap: 6 },
  counterBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.neutralSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  counterBtnText: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    lineHeight: 22,
  },
  counterVal: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text,
    minWidth: 22,
    textAlign: "center",
  },
  addKeyBtn: {
    height: 40,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
  },
  addKeyBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },

  allAddedRow: {
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
  },
  allAddedText: {
    fontSize: 13,
    color: theme.colors.textLight,
    fontStyle: "italic",
  },

  // ── Photos ────────────────────────────────────────────────────────────────
  photoSection: {
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },

  // ── Empty state ───────────────────────────────────────────────────────────
  empty: {
    padding: theme.spacing.lg,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: "dashed",
    alignItems: "center",
  },
  emptyText: { fontSize: 14, color: theme.colors.textLight },
});

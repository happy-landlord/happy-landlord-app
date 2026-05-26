import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  Briefcase,
  ChevronDown,
  KeyRound,
  Package,
  User,
  X,
} from "lucide-react-native";

import { theme } from "@/constants/theme";
import { PickerModal } from "@/components/ui/PickerModal";
import { CodeStickerCard } from "@/components/ui/CodeStickerCard";
import { PhotoPicker } from "@/components/ui/PhotoPicker";
import type { StickerEntry } from "@/lib/print";
import type { KeyItemType } from "@/services/keys.service";
import {
  makeKeySetCode,
  KEYSET_TYPE_LETTERS,
} from "@/services/properties.service";
import {
  FALLBACK_ITEM_ICON,
  ITEM_TYPE_ICON,
  ITEM_TYPE_LABEL,
} from "@/components/keyset/keysetLabels";
import type { KeyEntry, KeySetDraft } from "./types";

type SetType = KeySetDraft["setType"];

// ── Key type options — derived from the shared ITEM_TYPE_LABEL registry ────────

const KEY_TYPE_OPTIONS = (Object.keys(ITEM_TYPE_LABEL) as KeyItemType[]).map(
  (type) => {
    const Icon = ITEM_TYPE_ICON[type] ?? FALLBACK_ITEM_ICON;
    return {
      value: type,
      label: ITEM_TYPE_LABEL[type],
      icon: <Icon size={16} color={theme.colors.textMuted} strokeWidth={1.8} />,
    };
  },
);

// ── Set type config ───────────────────────────────────────────────────────────

type SetTypeCfg = {
  type: SetType;
  label: string;
  icon: (color: string) => React.ReactNode;
  color: string;
  bg: string;
};

const SET_TYPES: SetTypeCfg[] = [
  {
    type: "tenant",
    label: "Tenant",
    icon: (c) => <User size={30} strokeWidth={1.6} color={c} />,
    color: theme.colors.info,
    bg: theme.colors.infoSoft,
  },
  {
    type: "company",
    label: "Company",
    icon: (c) => <Briefcase size={30} strokeWidth={1.6} color={c} />,
    color: theme.colors.primary,
    bg: theme.colors.primarySoft,
  },
  {
    type: "unused",
    label: "Utility",
    icon: (c) => <Package size={30} strokeWidth={1.6} color={c} />,
    color: theme.colors.warning,
    bg: theme.colors.warningSoft,
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  keySets: KeySetDraft[];
  onChange: (sets: KeySetDraft[]) => void;
  /** Property code generated from address selection — used to derive keyset codes */
  propertyCode?: string;
};

export function KeysetsStep({ keySets, onChange, propertyCode }: Props) {
  const [activeType, setActiveType] = useState<SetType | null>(null);
  const [pendingType, setPendingType] = useState<KeyItemType>(
    KEY_TYPE_OPTIONS[0].value,
  );
  const [pendingCount, setPendingCount] = useState(1);
  const [pickerOpen, setPickerOpen] = useState(false);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function handleTypeSelect(cfg: SetTypeCfg) {
    setActiveType(cfg.type);
    setPendingCount(1);
    // Find first key type not already in this set
    const existingSet = keySets.find((s) => s.setType === cfg.type);
    const used = new Set(existingSet?.keys.map((k) => k.type) ?? []);
    const firstAvailable = KEY_TYPE_OPTIONS.find((o) => !used.has(o.value));
    setPendingType(firstAvailable?.value ?? KEY_TYPE_OPTIONS[0].value);
    // Create a draft set for this type if one doesn't exist yet
    if (!existingSet) {
      onChange([
        ...keySets,
        {
          id: `${cfg.type}-${Date.now()}`,
          setType: cfg.type,
          label: cfg.label,
          keys: [],
          notes: "",
        },
      ]);
    }
  }

  function addKeyEntry() {
    if (!activeType || pendingCount < 1 || allTypesAdded) return;
    // Guard: don't add a duplicate type
    if (usedTypes.has(pendingType)) return;
    const entry: KeyEntry = {
      id: `key-${Date.now()}`,
      type: pendingType,
      count: pendingCount,
    };
    const updatedSets = keySets.map((s) =>
      s.setType === activeType ? { ...s, keys: [...s.keys, entry] } : s,
    );
    onChange(updatedSets);
    // Advance pendingType to the next available option
    const nextAvailable = availableOptions.find((o) => o.value !== pendingType);
    setPendingType(nextAvailable?.value ?? KEY_TYPE_OPTIONS[0].value);
    setPendingCount(1);
  }

  function removeKeyEntry(setType: SetType, entryId: string) {
    onChange(
      keySets.map((s) =>
        s.setType === setType
          ? { ...s, keys: s.keys.filter((k) => k.id !== entryId) }
          : s,
      ),
    );
  }

  function patchActiveSet(patch: Partial<KeySetDraft>) {
    if (!activeType) return;
    onChange(
      keySets.map((s) => (s.setType === activeType ? { ...s, ...patch } : s)),
    );
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const activeCfg = SET_TYPES.find((c) => c.type === activeType);
  const activeSet = keySets.find((s) => s.setType === activeType);
  const totalKeys = activeSet?.keys.reduce((sum, k) => sum + k.count, 0) ?? 0;

  /** Picker options that haven't been added to the active set yet */
  const usedTypes = new Set(activeSet?.keys.map((k) => k.type) ?? []);
  const availableOptions = KEY_TYPE_OPTIONS.filter(
    (o) => !usedTypes.has(o.value),
  );
  const allTypesAdded = availableOptions.length === 0;

  /** e.g. "SYD-CBD-A001-C01" — shown in the subform header and encoded in QR */
  const keySetCode =
    propertyCode && activeType
      ? makeKeySetCode(
          propertyCode,
          activeType as keyof typeof KEYSET_TYPE_LETTERS,
        )
      : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <Text style={styles.subheading}>
        Select a set type then add the individual keys received.
      </Text>

      {/* ── Type selector cards ───────────────────────────────────────────── */}
      <View style={styles.typeRow}>
        {SET_TYPES.map((cfg) => {
          const selected = activeType === cfg.type;
          return (
            <Pressable
              key={cfg.type}
              style={({ pressed }) => [
                styles.typeCard,
                selected
                  ? { borderColor: cfg.color, backgroundColor: cfg.bg }
                  : styles.typeCardIdle,
                pressed && styles.typeCardPressed,
              ]}
              onPress={() => handleTypeSelect(cfg)}
              accessibilityRole="button"
              accessibilityLabel={`Select ${cfg.label}`}
              accessibilityState={{ selected }}
            >
              <View
                style={[
                  styles.typeIconWrap,
                  selected
                    ? { backgroundColor: cfg.bg }
                    : styles.typeIconWrapIdle,
                ]}
              >
                {cfg.icon(selected ? cfg.color : theme.colors.textLight)}
              </View>
              <Text
                style={[
                  styles.typeCardLabel,
                  { color: selected ? cfg.color : theme.colors.textMuted },
                ]}
              >
                {cfg.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── Active sub-form ───────────────────────────────────────────────── */}
      {activeCfg && activeSet && (
        <View style={[styles.subForm, { borderColor: activeCfg.color + "55" }]}>
          {/* Header: label + keyset code + total badge */}
          <View style={styles.subFormHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.subFormTitle, { color: activeCfg.color }]}>
                {activeCfg.label}
              </Text>
              {keySetCode && (
                <Text style={styles.keySetCode}>{keySetCode}</Text>
              )}
            </View>
            <View
              style={[styles.totalBadge, { backgroundColor: activeCfg.bg }]}
            >
              <KeyRound size={12} color={activeCfg.color} strokeWidth={2.2} />
              <Text style={[styles.totalBadgeText, { color: activeCfg.color }]}>
                {totalKeys} {totalKeys === 1 ? "Key" : "Keys"}
              </Text>
            </View>
          </View>

          {/* Tenant-only fields */}
          {activeType === "tenant" && (
            <View style={styles.tenantFields}>
              <TextInput
                style={styles.tenantInput}
                placeholder="Tenant name"
                placeholderTextColor={theme.colors.textLight}
                value={activeSet.tenantName ?? ""}
                onChangeText={(v) => patchActiveSet({ tenantName: v })}
                autoCapitalize="words"
              />
              <TextInput
                style={styles.tenantInput}
                placeholder="Tenant contact (phone / email)"
                placeholderTextColor={theme.colors.textLight}
                value={activeSet.tenantContact ?? ""}
                onChangeText={(v) => patchActiveSet({ tenantContact: v })}
                keyboardType="phone-pad"
                autoCapitalize="none"
              />
            </View>
          )}

          {/* Added key entries */}
          {activeSet.keys.length > 0 && (
            <View style={styles.keyList}>
              {activeSet.keys.map((entry) => {
                const Icon = ITEM_TYPE_ICON[entry.type] ?? FALLBACK_ITEM_ICON;
                return (
                  <View key={entry.id} style={styles.keyEntry}>
                    <Icon size={15} color={activeCfg.color} strokeWidth={1.8} />
                    <Text style={styles.keyEntryLabel} numberOfLines={1}>
                      {ITEM_TYPE_LABEL[entry.type]}
                    </Text>
                    <Text style={styles.keyEntryCount}>× {entry.count}</Text>
                    <Pressable
                      onPress={() => removeKeyEntry(activeType!, entry.id)}
                      hitSlop={8}
                    >
                      <X
                        size={16}
                        color={theme.colors.danger}
                        strokeWidth={2}
                      />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}

          {/* Divider */}
          <View style={styles.subFormDivider} />

          {/* Add-key row — hidden once all types have been added */}
          {allTypesAdded ? (
            <View style={styles.allAddedRow}>
              <Text style={styles.allAddedText}>
                All key types added for this set.
              </Text>
            </View>
          ) : (
            <View style={styles.addKeyRow}>
              <Pressable
                style={styles.keyTypePicker}
                onPress={() => setPickerOpen(true)}
              >
                {(() => {
                  const Icon =
                    ITEM_TYPE_ICON[pendingType] ?? FALLBACK_ITEM_ICON;
                  return (
                    <Icon
                      size={15}
                      color={theme.colors.textMuted}
                      strokeWidth={1.8}
                    />
                  );
                })()}
                <Text style={styles.keyTypePickerText} numberOfLines={1}>
                  {ITEM_TYPE_LABEL[pendingType]}
                </Text>
                <ChevronDown
                  size={14}
                  color={theme.colors.textMuted}
                  strokeWidth={2}
                />
              </Pressable>

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

              <Pressable
                style={({ pressed }) => [
                  styles.addKeyBtn,
                  { backgroundColor: activeCfg.color },
                  pressed && { opacity: 0.78 },
                ]}
                onPress={addKeyEntry}
              >
                <Text style={styles.addKeyBtnText}>Add</Text>
              </Pressable>
            </View>
          )}

          {/* ── Photos ────────────────────────────────────────────────── */}
          <View style={styles.photoSection}>
            <PhotoPicker
              uris={activeSet.photoUris ?? []}
              onChange={(uris) => patchActiveSet({ photoUris: uris })}
              color={activeCfg.color}
              label="Photos"
              hint="Tap to add photos of this key set"
              gridInset={theme.spacing.md * 2 + 5}
              compact
            />
          </View>
        </View>
      )}

      {/* ── Sticker card — shown as soon as a set type is selected ─────────── */}
      {activeCfg && activeSet && (
        <CodeStickerCard
          title={activeCfg.label}
          code={keySetCode}
          color={activeCfg.color}
          stickerEntries={
            activeSet.keys.length > 0 && keySetCode
              ? activeSet.keys.map(
                  (k): StickerEntry => ({
                    code: keySetCode,
                    label: ITEM_TYPE_LABEL[k.type],
                    count: k.count,
                  }),
                )
              : keySetCode
                ? [{ code: keySetCode, label: activeCfg.label, count: 1 }]
                : undefined
          }
          stickerSheetLabel={
            keySetCode ? `${activeCfg.label} — ${keySetCode}` : activeCfg.label
          }
        />
      )}

      {/* Prompt when nothing selected yet */}
      {!activeType && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            Tap a set type above to get started.
          </Text>
        </View>
      )}

      {/* ── Key type picker modal ─────────────────────────────────────────── */}
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

  // ── Type cards ───────────────────────────────────────────────────────────
  typeRow: { flexDirection: "row", gap: theme.spacing.sm },
  typeCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    gap: 8,
  },
  typeCardIdle: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  typeCardPressed: { opacity: 0.7 },
  typeIconWrap: {
    width: 54,
    height: 54,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  typeIconWrapIdle: { backgroundColor: theme.colors.neutralSoft },
  typeCardLabel: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 16,
  },

  // ── Sub-form ─────────────────────────────────────────────────────────────
  subForm: {
    borderWidth: 1.5,
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
  subFormTitle: { fontSize: 15, fontWeight: "700" },
  keySetCode: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textLight,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  totalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
  totalBadgeText: { fontSize: 13, fontWeight: "700" },

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

  subFormDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 2,
  },

  // ── Tenant fields ─────────────────────────────────────────────────────────
  tenantFields: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
  },
  tenantInput: {
    height: 42,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    fontSize: 14,
    color: theme.colors.text,
  },

  // ── Add key row ───────────────────────────────────────────────────────────
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
  photoSection: {
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});

import { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  Keyboard,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ChevronDown, KeyRound, X } from "lucide-react-native";

import {
  KEY_TYPE_ICON,
  KEY_TYPE_LABEL,
  PROPERTY_TYPES,
  theme,
} from "@/constants";
import {
  AddressSearch,
  Input,
  OutlinedField,
  OutlinedSelect,
  OutlinedDateField,
  PickerModal,
  type PlaceResult,
} from "@/components/ui";
import { formatLongDate } from "@/lib/utils";
import type { KeyType } from "@/types";

import type { KeyEntry, PropertyStep } from "./useAddPropertyWizard";

const KEY_TYPE_OPTIONS = (Object.keys(KEY_TYPE_LABEL) as KeyType[]).map(
  (type) => {
    const Icon = KEY_TYPE_ICON[type] ?? KeyRound;
    return {
      value: type,
      label: KEY_TYPE_LABEL[type],
      icon: <Icon size={16} color={theme.colors.textMuted} strokeWidth={1.8} />,
    };
  },
);

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  data: PropertyStep;
  onChange: (patch: Partial<PropertyStep>) => void;
  /** Fired when a new address is picked — parent triggers code generation. */
  onAddressSelect: (place: PlaceResult) => void;
  keys: KeyEntry[];
  onKeysChange: (keys: KeyEntry[]) => void;
};

export function PropertyInfoStep({
  data,
  onChange,
  onAddressSelect,
  keys,
  onKeysChange,
}: Props) {
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pendingType, setPendingType] = useState<KeyType>(
    KEY_TYPE_OPTIONS[0].value,
  );
  const [pendingCount, setPendingCount] = useState(1);
  const [pendingCode, setPendingCode] = useState("");
  const [pendingOtherLabel, setPendingOtherLabel] = useState("");
  const [keyPickerOpen, setKeyPickerOpen] = useState(false);

  const selectedTypeLabel =
    PROPERTY_TYPES.find((t) => t.value === data.propertyType)?.label ??
    "Select…";

  const totalKeys = keys.reduce((sum, k) => sum + k.count, 0);

  function addKey() {
    if (pendingCount < 1) return;
    const normalizedCode = pendingCode.trim() || null;
    const normalizedLabel =
      pendingType === "other" ? pendingOtherLabel.trim() || null : null;

    const existingIndex = keys.findIndex(
      (k) =>
        k.type === pendingType &&
        k.code === normalizedCode &&
        k.otherLabel === normalizedLabel,
    );

    if (existingIndex !== -1) {
      const updated = keys.map((k, i) =>
        i === existingIndex ? { ...k, count: k.count + pendingCount } : k,
      );
      onKeysChange(updated);
    } else {
      const entry: KeyEntry = {
        id: `key-${Date.now()}`,
        type: pendingType,
        count: pendingCount,
        code: normalizedCode,
        otherLabel: normalizedLabel,
      };
      onKeysChange([...keys, entry]);
    }

    const next = KEY_TYPE_OPTIONS.find((o) => o.value !== pendingType);
    setPendingType(next?.value ?? KEY_TYPE_OPTIONS[0].value);
    setPendingCount(1);
    setPendingCode("");
    setPendingOtherLabel("");
    Keyboard.dismiss();
  }

  function removeKey(id: string) {
    onKeysChange(keys.filter((k) => k.id !== id));
  }

  return (
    <View style={styles.container}>
      {/* Address */}
      <OutlinedField label="Address" required style={styles.addressField}>
        <AddressSearch
          placeholder="Search address…"
          mode="full"
          onSelect={(place) => {
            onChange({ selectedPlace: place });
            onAddressSelect(place);
          }}
          borderless
        />
      </OutlinedField>

      <OutlinedSelect
        label="Property Type"
        required
        value={selectedTypeLabel}
        onPress={() => setShowTypePicker(true)}
      />
      <PickerModal
        visible={showTypePicker}
        title="Property Type"
        options={PROPERTY_TYPES}
        value={data.propertyType}
        onSelect={(v) => onChange({ propertyType: v })}
        onClose={() => setShowTypePicker(false)}
      />

      <Input
        label="Landlord / Owner"
        placeholder="Full name"
        value={data.landlordName}
        onChangeText={(landlordName) => onChange({ landlordName })}
        autoCapitalize="words"
      />

      {/* Landlord Contact + Date Received */}
      <View style={styles.inlineRow}>
        <Input
          label="Landlord Contact"
          placeholder="Phone number"
          value={data.landlordContact}
          onChangeText={(landlordContact) => onChange({ landlordContact })}
          keyboardType="phone-pad"
          containerStyle={styles.phoneField}
        />
        <OutlinedDateField
          label="Date Received"
          value={formatLongDate(data.dateReceived)}
          onPress={() => setShowDatePicker(true)}
          style={styles.dateField}
        />
      </View>
      {showDatePicker && (
        <DateTimePicker
          value={data.dateReceived}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          maximumDate={new Date()}
          onChange={(_, selected) => {
            setShowDatePicker(Platform.OS === "ios");
            if (selected) onChange({ dateReceived: selected });
          }}
        />
      )}

      {/* ── Keys received ───────────────────────────────────────────────────── */}
      <View style={styles.keysCard}>
        {/* Header */}
        <View style={styles.keysCardHeader}>
          <Text style={styles.keysCardTitle}>Keys Received</Text>
          <View style={styles.totalBadge}>
            <KeyRound size={12} color={theme.colors.accent} strokeWidth={2.2} />
            <Text style={styles.totalBadgeText}>
              {totalKeys} {totalKeys === 1 ? "Key" : "Keys"}
            </Text>
          </View>
        </View>

        {/* Added entries */}
        {keys.length > 0 && (
          <View style={styles.keyList}>
            {keys.map((entry) => {
              const Icon = KEY_TYPE_ICON[entry.type] ?? KeyRound;
              return (
                <View key={entry.id} style={styles.keyEntry}>
                  <Icon
                    size={15}
                    color={theme.colors.accent}
                    strokeWidth={1.8}
                  />
                  <Text style={styles.keyEntryLabel} numberOfLines={1}>
                    {entry.type === "other" && entry.otherLabel
                      ? entry.otherLabel
                      : KEY_TYPE_LABEL[entry.type]}
                  </Text>
                  {entry.code ? (
                    <View style={styles.codeBadge}>
                      <Text style={styles.codeBadgeText} numberOfLines={1}>
                        {entry.code}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{entry.count}</Text>
                  </View>
                  <Pressable onPress={() => removeKey(entry.id)} hitSlop={8}>
                    <X size={16} color={theme.colors.danger} strokeWidth={2} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.divider} />

        {/* Add-key row */}
        <>
          <View style={styles.addKeyRow}>
            <Pressable
              style={styles.keyTypePicker}
              onPress={() => setKeyPickerOpen(true)}
            >
              {(() => {
                const Icon = KEY_TYPE_ICON[pendingType] ?? KeyRound;
                return (
                  <Icon
                    size={15}
                    color={theme.colors.textMuted}
                    strokeWidth={1.8}
                  />
                );
              })()}
              <Text style={styles.keyTypePickerText} numberOfLines={1}>
                {KEY_TYPE_LABEL[pendingType]}
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
                pressed && { opacity: 0.78 },
              ]}
              onPress={addKey}
            >
              <Text style={styles.addKeyBtnText}>Add</Text>
            </Pressable>
          </View>
          {/* Name + code inputs inline */}
          <View style={styles.codeRow}>
            {pendingType === "other" && (
              <Input
                placeholder="Key label"
                value={pendingOtherLabel}
                onChangeText={setPendingOtherLabel}
                returnKeyType="next"
                maxLength={40}
                containerStyle={styles.codeInputFlex}
                style={styles.codeInputText}
              />
            )}
            <Input
              placeholder="Code / tag #"
              value={pendingCode}
              onChangeText={setPendingCode}
              returnKeyType="done"
              maxLength={30}
              onSubmitEditing={() => Keyboard.dismiss()}
              containerStyle={
                pendingType === "other"
                  ? styles.codeInputFixed
                  : styles.codeInputFlex
              }
              style={styles.codeInputText}
            />
          </View>
        </>
      </View>

      <PickerModal
        visible={keyPickerOpen}
        title="Key Type"
        options={KEY_TYPE_OPTIONS}
        value={pendingType}
        onSelect={(v) => setPendingType(v as KeyType)}
        onClose={() => setKeyPickerOpen(false)}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  addressField: {
    paddingHorizontal: theme.spacing.sm,
    zIndex: 1000,
    elevation: 24,
  },
  inlineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
  },
  phoneField: { flex: 1, marginTop: 10 },
  dateField: { width: 155 },

  // ── Keys card ─────────────────────────────────────────────────────────────
  keysCard: {
    marginTop: theme.spacing.sm,
    borderWidth: 1.5,
    borderColor: theme.colors.accentSoft,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  keysCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  keysCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.accent,
  },
  totalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accentSoft,
  },
  totalBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.accent,
  },
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
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accentSoft,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.accent,
  },
  codeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.neutralSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    maxWidth: 80,
  },
  codeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 2,
  },
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
  addKeyBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.accent,
  },
  codeRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    alignItems: "center",
  },
  codeInputFlex: {
    flex: 1,
    marginTop: 0,
    height: 40,
    paddingHorizontal: theme.spacing.sm,
  },
  codeInputFixed: {
    width: 130,
    marginTop: 0,
    height: 40,
    paddingHorizontal: theme.spacing.sm,
  },
  codeInputText: {
    height: 38,
    fontSize: 13,
  },
});

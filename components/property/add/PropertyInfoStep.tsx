import { useState } from "react";
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
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
  BottomSheet,
  Button,
  Input,
  OutlinedSelect,
  OutlinedDateField,
  PickerModal,
  type PlaceResult,
} from "@/components/ui";
import { formatLongDate } from "@/lib/utils";
import { useDeveloperSuggestions } from "@/lib/hooks";
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
  const [devFocused, setDevFocused] = useState(false);

  const { suggestions: devSuggestions, clear: clearDevSuggestions } =
    useDeveloperSuggestions(devFocused ? data.developerName : "");

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
      <AddressSearch
        label="Address"
        required
        placeholder="Search address…"
        mode="full"
        labelBackground={theme.colors.background}
        containerStyle={styles.addressField}
        onSelect={(place) => {
          onChange({ selectedPlace: place });
          onAddressSelect(place);
        }}
      />

      <OutlinedSelect
        label="Property Type"
        required
        value={selectedTypeLabel}
        focused={showTypePicker}
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
        labelBackground={theme.colors.background}
        onFocus={() => setShowDatePicker(false)}
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
          labelBackground={theme.colors.background}
          onFocus={() => setShowDatePicker(false)}
        />
        <OutlinedDateField
          label="Date Received"
          value={formatLongDate(data.dateReceived)}
          focused={showDatePicker}
          onPress={() => {
            Keyboard.dismiss();
            setShowDatePicker(true);
          }}
          style={styles.dateField}
        />
      </View>

      <BottomSheet
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
      >
        <DateTimePicker
          value={data.dateReceived}
          mode="date"
          display="spinner"
          textColor={theme.colors.text}
          themeVariant="light"
          maximumDate={new Date()}
          onChange={(_, selected) => {
            if (selected) onChange({ dateReceived: selected });
          }}
          style={styles.datePicker}
        />
        <View style={styles.datePickerActions}>
          <Button
            title="Cancel"
            variant="outline"
            onPress={() => setShowDatePicker(false)}
            style={styles.datePickerBtn}
          />
          <Button
            title="Done"
            variant="primary"
            onPress={() => setShowDatePicker(false)}
            style={styles.datePickerBtn}
          />
        </View>
      </BottomSheet>

      {/* Developer Name (with autocomplete) + Cabinet Slot */}
      <View style={styles.inlineRow}>
        <View style={{ flex: 1 }}>
          <Input
            label="Developer Name"
            value={data.developerName}
            onChangeText={(developerName) => onChange({ developerName })}
            autoCapitalize="words"
            labelBackground={theme.colors.background}
            onFocus={() => { setShowDatePicker(false); setDevFocused(true); }}
            onBlur={() => setDevFocused(false)}
          />
          {devFocused && devSuggestions.length > 0 && (
            <ScrollView
              style={styles.suggestionsDropdown}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {devSuggestions.map((name) => (
                <Pressable
                  key={name}
                  style={({ pressed }) => [
                    styles.suggestionRow,
                    pressed && styles.suggestionRowPressed,
                  ]}
                  onPress={() => {
                    onChange({ developerName: name });
                    clearDevSuggestions();
                    setDevFocused(false);
                    Keyboard.dismiss();
                  }}
                >
                  <Text style={styles.suggestionText} numberOfLines={1}>{name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
        <Input
          label="Cabinet Slot"
          value={data.cabinetCode}
          onChangeText={(cabinetCode) => onChange({ cabinetCode })}
          autoCapitalize="characters"
          containerStyle={{ width: 130 }}
          labelBackground={theme.colors.background}
          onFocus={() => { setShowDatePicker(false); setDevFocused(false); }}
        />
      </View>

      {/* ── Keys received ───────────────────────────────────────────────────── */}
      <View style={styles.keysCard}>
        {/* Header */}
        <View style={styles.keysCardHeader}>
          <Text style={styles.keysCardTitle}>Keys Received</Text>
          <Text style={styles.totalCount}>
            {totalKeys} {totalKeys === 1 ? "key" : "keys"}
          </Text>
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
              <TextInput
                placeholder="Key label"
                value={pendingOtherLabel}
                onChangeText={setPendingOtherLabel}
                placeholderTextColor={theme.colors.textLight}
                selectionColor={theme.colors.text}
                returnKeyType="next"
                maxLength={40}
                style={styles.codeInputFlex}
                onFocus={() => setShowDatePicker(false)}
              />
            )}
            <TextInput
              placeholder="Code / tag #"
              value={pendingCode}
              onChangeText={setPendingCode}
              placeholderTextColor={theme.colors.textLight}
              selectionColor={theme.colors.text}
              returnKeyType="done"
              maxLength={30}
              onSubmitEditing={() => Keyboard.dismiss()}
              style={
                pendingType === "other"
                  ? styles.codeInputFixed
                  : styles.codeInputFlex
              }
              onFocus={() => setShowDatePicker(false)}
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
    zIndex: 1000,
    elevation: 24,
  },
  inlineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
  },
  suggestionsDropdown: {
    position: "absolute",
    bottom: "100%",
    left: 0,
    right: 0,
    maxHeight: 180,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    marginBottom: 4,
    zIndex: 999,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  suggestionRow: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  suggestionRowPressed: {
    backgroundColor: theme.colors.neutralSoft,
  },
  suggestionText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: "500",
  },
  phoneField: { flex: 1, marginTop: 10 },
  dateField: { width: 155 },
  datePicker: { width: "100%" },
  datePickerActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  datePickerBtn: { flex: 1 },

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
  totalCount: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textMuted,
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
    backgroundColor: theme.colors.accent,
  },
  addKeyBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.textInverse,
  },
  codeRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    alignItems: "center",
  },
  codeInputFlex: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.sm,
    fontSize: 13,
    color: theme.colors.text,
    paddingVertical: 0,
  },
  codeInputFixed: {
    width: 130,
    height: 40,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.sm,
    fontSize: 13,
    color: theme.colors.text,
    paddingVertical: 0,
  },
});

import { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { KeyRound, Plus, Trash2 } from "lucide-react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";

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
  FormSection,
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

const QTY_OPTIONS = Array.from({ length: 6 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  data: PropertyStep;
  onChange: (patch: Partial<PropertyStep>) => void;
  /** Fired when a new address is picked — parent triggers code generation. */
  onAddressSelect: (place: PlaceResult) => void;
  keys: KeyEntry[];
  onKeysChange: (keys: KeyEntry[]) => void;
  /** Set while the duplicate-address check is in flight. */
  addressChecking?: boolean;
  /** Error message to show below the address field (e.g. duplicate warning). */
  addressError?: string | null;
};

export function PropertyInfoStep({
  data,
  onChange,
  onAddressSelect,
  keys,
  onKeysChange,
  addressChecking = false,
  addressError = null,
}: Props) {
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeTypePickerFor, setActiveTypePickerFor] = useState<string | null>(
    null,
  );
  const [activeQtyPickerFor, setActiveQtyPickerFor] = useState<string | null>(
    null,
  );
  const [devFocused, setDevFocused] = useState(false);

  const { suggestions: devSuggestions, clear: clearDevSuggestions } =
    useDeveloperSuggestions(devFocused ? data.developerName : "");

  const selectedTypeLabel =
    PROPERTY_TYPES.find((t) => t.value === data.propertyType)?.label ??
    "Select…";

  const totalKeys = keys.reduce((sum, k) => sum + (k.count || 0), 0);

  function addKey() {
    const entry: KeyEntry = {
      id: `key-${Date.now()}`,
      type: KEY_TYPE_OPTIONS[0].value,
      count: 1,
      code: null,
      otherLabel: null,
    };
    onKeysChange([...keys, entry]);
  }

  function updateKey(id: string, patch: Partial<KeyEntry>) {
    onKeysChange(keys.map((k) => (k.id === id ? { ...k, ...patch } : k)));
  }

  function removeKey(id: string) {
    onKeysChange(keys.filter((k) => k.id !== id));
  }

  return (
    <View style={styles.container}>

      {/* ── Property Details ────────────────────────────────────────────────── */}
      <FormSection title="Property Details" cardStyle={styles.cardNoGap}>
        <AddressSearch
          label="Address"
          required
          placeholder="Search address…"
          mode="full"
          labelBackground={theme.colors.surface}
          containerStyle={styles.addressField}
          onSelect={(place) => {
            onChange({ selectedPlace: place });
            onAddressSelect(place);
          }}
        />
        {addressChecking && (
          <View style={styles.addressFeedbackRow}>
            <ActivityIndicator size="small" color={theme.colors.textMuted} />
            <Text style={styles.addressCheckingText}>Checking address…</Text>
          </View>
        )}
        {!addressChecking && addressError && (
          <View style={styles.addressFeedbackRow}>
            <Text style={styles.addressErrorText}>{addressError}</Text>
          </View>
        )}

        <OutlinedSelect
          label="Property Type"
          required
          value={selectedTypeLabel}
          focused={showTypePicker}
          onPress={() => setShowTypePicker(true)}
          labelBackground={theme.colors.surface}
        />

        {/* Developer Name + Cabinet Slot */}
        <View style={styles.inlineRow}>
          <View style={{ flex: 1 }}>
            <Input
              label="Developer Name"
              value={data.developerName}
              onChangeText={(developerName) => onChange({ developerName })}
              autoCapitalize="words"
              labelBackground={theme.colors.surface}
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
            labelBackground={theme.colors.surface}
            onFocus={() => { setShowDatePicker(false); setDevFocused(false); }}
          />
        </View>
      </FormSection>

      <PickerModal
        visible={showTypePicker}
        title="Property Type"
        options={PROPERTY_TYPES}
        value={data.propertyType}
        onSelect={(v) => onChange({ propertyType: v })}
        onClose={() => setShowTypePicker(false)}
      />

      {/* ── Landlord Information ─────────────────────────────────────────────── */}
      <FormSection title="Landlord Information" cardStyle={styles.cardNoGap}>
        <Input
          label="Landlord / Owner"
          placeholder="Full name"
          value={data.landlordName}
          onChangeText={(landlordName) => onChange({ landlordName })}
          autoCapitalize="words"
          labelBackground={theme.colors.surface}
          onFocus={() => setShowDatePicker(false)}
        />
        <View style={styles.inlineRow}>
          <Input
            label="Landlord Contact"
            placeholder="Phone number"
            value={data.landlordContact}
            onChangeText={(landlordContact) => onChange({ landlordContact })}
            keyboardType="phone-pad"
            containerStyle={styles.phoneField}
            labelBackground={theme.colors.surface}
            onFocus={() => setShowDatePicker(false)}
          />
          <OutlinedDateField
            label="Date Received"
            value={formatLongDate(data.dateReceived)}
            focused={showDatePicker}
            onPress={() => { Keyboard.dismiss(); setShowDatePicker(true); }}
            style={styles.dateField}
            labelBackground={theme.colors.surface}
          />
        </View>
      </FormSection>

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


      {/* ── Keys received ───────────────────────────────────────────────────── */}
      <View style={styles.keysSection}>
        {/* Header */}
        <View style={styles.keysHeader}>
          <Text style={styles.sectionGroupTitle}>Keys Received</Text>
          {totalKeys > 0 && (
            <Text style={styles.totalCount}>
              {totalKeys} {totalKeys === 1 ? "key" : "keys"}
            </Text>
          )}
        </View>

        {/* Editable key cards */}
        {keys.map((entry) => (
          <ReanimatedSwipeable
            key={entry.id}
            renderRightActions={() => (
              <Pressable
                style={styles.swipeDeleteAction}
                onPress={() => removeKey(entry.id)}
              >
                <Trash2 size={18} color="#fff" strokeWidth={1.8} />
                <Text style={styles.swipeDeleteText}>Remove</Text>
              </Pressable>
            )}
            rightThreshold={40}
            overshootRight={false}
          >
            <View style={styles.keyFormCard}>
              {/* Type | Code | Qty row */}
              <View style={styles.keyFormRow}>
                <OutlinedSelect
                  value={KEY_TYPE_LABEL[entry.type]}
                  focused={activeTypePickerFor === entry.id}
                  onPress={() => setActiveTypePickerFor(entry.id)}
                  style={styles.keyTypeField}
                  labelBackground={theme.colors.surface}
                />
                <Input
                  placeholder="Code #"
                  value={entry.code ?? ""}
                  onChangeText={(v) =>
                    updateKey(entry.id, { code: v.trim() || null })
                  }
                  autoCapitalize="characters"
                  maxLength={30}
                  containerStyle={styles.keyCodeField}
                  labelBackground={theme.colors.surface}
                  onFocus={() => setShowDatePicker(false)}
                />
                <OutlinedSelect
                  value={String(entry.count)}
                  focused={activeQtyPickerFor === entry.id}
                  onPress={() => setActiveQtyPickerFor(entry.id)}
                  style={styles.keyQtyField}
                  labelBackground={theme.colors.surface}
                />
              </View>

              {/* "Other" label input */}
              {entry.type === "other" && (
                <Input
                  placeholder="Key label"
                  value={entry.otherLabel ?? ""}
                  onChangeText={(v) =>
                    updateKey(entry.id, { otherLabel: v || null })
                  }
                  maxLength={40}
                  containerStyle={styles.keyOtherField}
                  labelBackground={theme.colors.surface}
                  onFocus={() => setShowDatePicker(false)}
                />
              )}
            </View>
          </ReanimatedSwipeable>
        ))}

        {/* Dotted "Add Key" button — always visible */}
        <Pressable
          style={({ pressed }) => [
            styles.addKeyDotBtn,
            pressed && { opacity: 0.7 },
          ]}
          onPress={addKey}
        >
          <Plus size={16} color={theme.colors.accent} strokeWidth={2.2} />
          <Text style={styles.addKeyDotBtnText}>Add Key</Text>
        </Pressable>
      </View>

      {/* Single shared PickerModal for key type selection */}
      <PickerModal
        visible={activeTypePickerFor !== null}
        title="Key Type"
        options={KEY_TYPE_OPTIONS}
        value={
          keys.find((k) => k.id === activeTypePickerFor)?.type ??
          KEY_TYPE_OPTIONS[0].value
        }
        onSelect={(v) => {
          if (activeTypePickerFor) {
            updateKey(activeTypePickerFor, {
              type: v as KeyType,
              otherLabel: null,
            });
          }
        }}
        onClose={() => setActiveTypePickerFor(null)}
      />
      {/* Single shared PickerModal for quantity selection */}
      <PickerModal
        visible={activeQtyPickerFor !== null}
        title="Quantity"
        options={QTY_OPTIONS}
        value={String(
          keys.find((k) => k.id === activeQtyPickerFor)?.count ?? 1,
        )}
        onSelect={(v) => {
          if (activeQtyPickerFor) {
            updateKey(activeQtyPickerFor, { count: Number(v) });
          }
        }}
        onClose={() => setActiveQtyPickerFor(null)}
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

  // ── Section groups ────────────────────────────────────────────────────────
  sectionGroupTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: theme.spacing.xs,
  },
  // Property/landlord cards space fields via their own top margins.
  cardNoGap: { gap: 0 },

  // ── Shared field helpers ──────────────────────────────────────────────────
  addressField: {
    zIndex: 1000,
    elevation: 24,
  },
  addressFeedbackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginTop: -theme.spacing.xs,
    paddingHorizontal: 4,
  },
  addressCheckingText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontStyle: "italic",
  },
  addressErrorText: {
    fontSize: 13,
    color: theme.colors.danger,
    fontWeight: "500",
    flexShrink: 1,
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

  // ── Keys section ──────────────────────────────────────────────────────────
  keysSection: {
    gap: theme.spacing.sm,
  },
  keysHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalCount: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },

  // Editable key form card
  keyFormCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  keyFormRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  keyTypeField: {
    flex: 2,
    marginTop: 0,
  },
  keyCodeField: {
    flex: 2,
    marginTop: 0,
  },
  keyQtyField: {
    width: 72,
    marginTop: 0,
  },
  keyOtherField: {
    marginTop: 0,
  },

  // Swipe-to-delete action
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

  // Dotted "Add Key" button
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

import { useState } from "react";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { KeyRound, Plus, Trash2 } from "lucide-react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";

import { KEY_TYPE_ICON, KEY_TYPE_LABEL, theme } from "@/constants";
import {
  BottomSheet,
  Button,
  FormSection,
  Input,
  OutlinedDateField,
  OutlinedSelect,
  PickerModal,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";
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

const QTY_OPTIONS = Array.from({ length: 6 }, (_, index) => ({
  value: String(index + 1),
  label: String(index + 1),
}));

type Props = {
  data: PropertyStep;
  onChange: (patch: Partial<PropertyStep>) => void;
  keys: KeyEntry[];
  onKeysChange: (keys: KeyEntry[]) => void;
};

export function KeysStep({ data, onChange, keys, onKeysChange }: Props) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeTypePickerFor, setActiveTypePickerFor] = useState<string | null>(
    null,
  );
  const [activeQtyPickerFor, setActiveQtyPickerFor] = useState<string | null>(
    null,
  );

  const totalKeys = keys.reduce((sum, key) => sum + (key.count ?? 0), 0);

  function addKey() {
    onKeysChange([
      ...keys,
      {
        id: `key-${Date.now()}`,
        type: KEY_TYPE_OPTIONS[0].value,
        count: 1,
        code: null,
        otherLabel: null,
      },
    ]);
  }

  function updateKey(id: string, patch: Partial<KeyEntry>) {
    onKeysChange(
      keys.map((key) => (key.id === id ? { ...key, ...patch } : key)),
    );
  }

  function removeKey(id: string) {
    onKeysChange(keys.filter((key) => key.id !== id));
  }

  return (
    <View style={styles.container}>
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
            value={formatDate(data.dateReceived.toISOString())}
            focused={showDatePicker}
            onPress={() => {
              Keyboard.dismiss();
              setShowDatePicker(true);
            }}
            style={styles.dateField}
            labelBackground={theme.colors.surface}
          />
        </View>
      </FormSection>

      <FormSection
        title="Keys Received"
        card={false}
        action={
          totalKeys > 0 ? (
            <Text style={styles.totalCount}>
              {totalKeys} {totalKeys === 1 ? "key" : "keys"}
            </Text>
          ) : null
        }
      >
        <View style={styles.keysList}>
          {keys.map((entry) => (
            <ReanimatedSwipeable
              key={entry.id}
              renderRightActions={() => (
                <Pressable
                  style={styles.swipeDeleteAction}
                  onPress={() => removeKey(entry.id)}
                  accessibilityRole="button"
                  accessibilityLabel="Remove key"
                >
                  <Trash2
                    size={18}
                    color={theme.colors.textInverse}
                    strokeWidth={1.8}
                  />
                  <Text style={styles.swipeDeleteText}>Remove</Text>
                </Pressable>
              )}
              rightThreshold={40}
              dragOffsetFromRightEdge={20}
              dragOffsetFromLeftEdge={10000}
              overshootLeft={false}
              overshootRight={false}
            >
              <View style={styles.keyFormCard}>
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
                    onChangeText={(code) =>
                      updateKey(entry.id, { code: code || null })
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

                {entry.type === "other" ? (
                  <Input
                    placeholder="Key label"
                    value={entry.otherLabel ?? ""}
                    onChangeText={(otherLabel) =>
                      updateKey(entry.id, { otherLabel: otherLabel || null })
                    }
                    maxLength={40}
                    containerStyle={styles.keyOtherField}
                    labelBackground={theme.colors.surface}
                    onFocus={() => setShowDatePicker(false)}
                  />
                ) : null}
              </View>
            </ReanimatedSwipeable>
          ))}

          <Pressable
            style={({ pressed }) => [
              styles.addKeyButton,
              pressed && styles.addKeyButtonPressed,
            ]}
            onPress={addKey}
            accessibilityRole="button"
            accessibilityLabel="Add key"
          >
            <Plus size={16} color={theme.colors.accent} strokeWidth={2.2} />
            <Text style={styles.addKeyButtonText}>Add Key</Text>
          </Pressable>
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
          onValueChange={(_, selected) => onChange({ dateReceived: selected })}
          style={styles.datePicker}
        />
        <View style={styles.datePickerActions}>
          <Button
            title="Cancel"
            variant="outline"
            onPress={() => setShowDatePicker(false)}
            style={styles.datePickerButton}
          />
          <Button
            title="Done"
            variant="primary"
            onPress={() => setShowDatePicker(false)}
            style={styles.datePickerButton}
          />
        </View>
      </BottomSheet>

      <PickerModal
        visible={activeTypePickerFor !== null}
        title="Key Type"
        options={KEY_TYPE_OPTIONS}
        value={
          keys.find((key) => key.id === activeTypePickerFor)?.type ??
          KEY_TYPE_OPTIONS[0].value
        }
        onSelect={(type) => {
          if (!activeTypePickerFor) return;
          updateKey(activeTypePickerFor, {
            type: type as KeyType,
            otherLabel: null,
          });
        }}
        onClose={() => setActiveTypePickerFor(null)}
      />
      <PickerModal
        visible={activeQtyPickerFor !== null}
        title="Quantity"
        options={QTY_OPTIONS}
        value={String(
          keys.find((key) => key.id === activeQtyPickerFor)?.count ?? 1,
        )}
        onSelect={(count) => {
          if (!activeQtyPickerFor) return;
          updateKey(activeQtyPickerFor, { count: Number(count) });
        }}
        onClose={() => setActiveQtyPickerFor(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  cardNoGap: { gap: 0 },
  inlineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
  },
  phoneField: { flex: 1, marginTop: 10 },
  dateField: { width: 155 },
  datePicker: { width: "100%" },
  datePickerActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  datePickerButton: { flex: 1 },
  totalCount: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  keysList: { gap: theme.spacing.sm },
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
  keyTypeField: { flex: 2, marginTop: 0 },
  keyCodeField: { flex: 2, marginTop: 0 },
  keyQtyField: { width: 72, marginTop: 0 },
  keyOtherField: { marginTop: 0 },
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
    color: theme.colors.textInverse,
  },
  addKeyButton: {
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
  addKeyButtonPressed: { opacity: 0.7 },
  addKeyButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.accent,
  },
});

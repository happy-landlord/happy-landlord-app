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

import { PROPERTY_TYPES, theme } from "@/constants";
import {
  AddressSearch,
  FormSection,
  Input,
  OutlinedSelect,
  PickerModal,
  Toggle,
  type ToggleOption,
  type PlaceResult,
} from "@/components/ui";
import { useDeveloperSuggestions } from "@/lib/hooks";
import type { RentalStatus } from "@/types";

import type { PropertyStep } from "./useAddPropertyWizard";
import {
  normalizePropertyDecimalInput,
  normalizePropertyIntegerInput,
} from "./propertyForm";

const RENTAL_STATUS_OPTIONS: readonly [
  ToggleOption<RentalStatus>,
  ToggleOption<RentalStatus>,
] = [
  { value: "short", label: "Short Term" },
  { value: "long", label: "Long Term" },
];

type Props = {
  data: PropertyStep;
  onChange: (patch: Partial<PropertyStep>) => void;
  onAddressSelect: (place: PlaceResult) => void;
  onAddressClear: () => void;
  addressChecking?: boolean;
  addressError?: string | null;
};

export function PropertyInfoStep({
  data,
  onChange,
  onAddressSelect,
  onAddressClear,
  addressChecking = false,
  addressError = null,
}: Props) {
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [devFocused, setDevFocused] = useState(false);

  const { suggestions: devSuggestions, clear: clearDevSuggestions } =
    useDeveloperSuggestions(devFocused ? data.developerName : "");

  const selectedTypeLabel =
    PROPERTY_TYPES.find((type) => type.value === data.propertyType)?.label ??
    "Select…";
  return (
    <View style={styles.container}>
      <FormSection title="Property Details" cardStyle={styles.cardNoGap}>
        <AddressSearch
          label="Address"
          required
          placeholder="Search address…"
          mode="full"
          allowManualEntry
          initialValue={data.selectedPlace?.description}
          labelBackground={theme.colors.surface}
          containerStyle={styles.addressField}
          onSelect={(place) => {
            onChange({ selectedPlace: place });
            onAddressSelect(place);
          }}
          onManualClear={() => {
            onChange({ selectedPlace: null });
            onAddressClear();
          }}
        />
        {addressChecking ? (
          <View style={styles.addressFeedbackRow}>
            <ActivityIndicator size="small" color={theme.colors.textMuted} />
            <Text style={styles.addressCheckingText}>Checking address…</Text>
          </View>
        ) : null}
        {!addressChecking && addressError ? (
          <View style={styles.addressFeedbackRow}>
            <Text style={styles.addressErrorText}>{addressError}</Text>
          </View>
        ) : null}

        <Input
          label="Title"
          placeholder="Optional custom title"
          value={data.title}
          onChangeText={(title) => onChange({ title })}
          autoCapitalize="words"
          labelBackground={theme.colors.surface}
        />

        <OutlinedSelect
          label="Type"
          required
          value={selectedTypeLabel}
          focused={showTypePicker}
          onPress={() => setShowTypePicker(true)}
          labelBackground={theme.colors.surface}
        />
      </FormSection>

      <FormSection title="Building & Management" cardStyle={styles.cardNoGap}>
        <View style={styles.inlineRow}>
          <View style={styles.flexField}>
            <Input
              label="Developer Name"
              value={data.developerName}
              onChangeText={(developerName) => onChange({ developerName })}
              autoCapitalize="words"
              labelBackground={theme.colors.surface}
              onFocus={() => setDevFocused(true)}
              onBlur={() => setDevFocused(false)}
            />
            {devFocused && devSuggestions.length > 0 ? (
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
                    <Text style={styles.suggestionText} numberOfLines={1}>
                      {name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
          </View>
          <Input
            label="Consultant Name"
            value={data.consultantName}
            onChangeText={(consultantName) => onChange({ consultantName })}
            autoCapitalize="words"
            containerStyle={styles.flexField}
            labelBackground={theme.colors.surface}
          />
        </View>

        <View style={styles.inlineRow}>
          <Input
            label="Lot #"
            value={data.lotNumber}
            onChangeText={(lotNumber) => onChange({ lotNumber })}
            autoCapitalize="characters"
            containerStyle={styles.flexField}
            labelBackground={theme.colors.surface}
          />
          <Input
            label="MAA Fee"
            value={data.maaFee}
            onChangeText={(maaFee) =>
              onChange({ maaFee: normalizePropertyDecimalInput(maaFee) })
            }
            keyboardType="decimal-pad"
            maxLength={13}
            containerStyle={styles.flexField}
            labelBackground={theme.colors.surface}
          />
          <Input
            label="Cabinet Slot"
            value={data.cabinetCode}
            onChangeText={(cabinetCode) => onChange({ cabinetCode })}
            autoCapitalize="characters"
            containerStyle={styles.cabinetInput}
            labelBackground={theme.colors.surface}
          />
        </View>

        <Toggle
          label="Rental Status"
          options={RENTAL_STATUS_OPTIONS}
          value={data.rentalStatus}
          onChange={(rentalStatus) => onChange({ rentalStatus })}
        />
      </FormSection>

      <FormSection title="Property Features" cardStyle={styles.cardNoGap}>
        <View style={styles.inlineRow}>
          <Input
            label="Bedrooms"
            value={data.bedrooms}
            onChangeText={(bedrooms) =>
              onChange({ bedrooms: normalizePropertyIntegerInput(bedrooms) })
            }
            keyboardType="number-pad"
            maxLength={3}
            containerStyle={styles.flexField}
            labelBackground={theme.colors.surface}
          />
          <Input
            label="Bathrooms"
            value={data.bathrooms}
            onChangeText={(bathrooms) =>
              onChange({ bathrooms: normalizePropertyIntegerInput(bathrooms) })
            }
            keyboardType="number-pad"
            maxLength={3}
            containerStyle={styles.flexField}
            labelBackground={theme.colors.surface}
          />
          <Input
            label="Carparks"
            value={data.carparks}
            onChangeText={(carparks) =>
              onChange({ carparks: normalizePropertyIntegerInput(carparks) })
            }
            keyboardType="number-pad"
            maxLength={3}
            containerStyle={styles.flexField}
            labelBackground={theme.colors.surface}
          />
        </View>

        <Input
          label="Parking Location"
          value={data.parkingLocation}
          onChangeText={(parkingLocation) => onChange({ parkingLocation })}
          autoCapitalize="sentences"
          labelBackground={theme.colors.surface}
        />
        <Input
          label="Storage Location"
          value={data.storageLocation}
          onChangeText={(storageLocation) => onChange({ storageLocation })}
          autoCapitalize="sentences"
          labelBackground={theme.colors.surface}
        />
      </FormSection>

      <FormSection title="Property Notes" cardStyle={styles.cardNoGap}>
        <Input
          label="Defects"
          placeholder="Record any known defects"
          value={data.defects}
          onChangeText={(defects) => onChange({ defects })}
          multiline
          maxLength={2000}
          labelBackground={theme.colors.surface}
        />
        <Input
          label="Notes"
          placeholder="Amenities and other useful information"
          value={data.notes}
          onChangeText={(notes) => onChange({ notes })}
          multiline
          maxLength={2000}
          labelBackground={theme.colors.surface}
        />
      </FormSection>

      <PickerModal
        visible={showTypePicker}
        title="Property Type"
        options={PROPERTY_TYPES}
        value={data.propertyType}
        onSelect={(propertyType) => onChange({ propertyType })}
        onClose={() => setShowTypePicker(false)}
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
  flexField: { flex: 1 },
  cabinetInput: { width: 112 },
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
  suggestionRowPressed: { backgroundColor: theme.colors.neutralSoft },
  suggestionText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: "500",
  },
});

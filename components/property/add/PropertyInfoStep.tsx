import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

import { theme } from "@/constants/theme";
import {
  AddressSearch,
  type AddressSearchRef,
  type PlaceResult,
} from "@/components/ui/AddressSearch";
import { Input } from "@/components/ui/Input";
import {
  OutlinedField,
  OutlinedSelect,
  OutlinedDateField,
} from "@/components/ui/OutlinedField";
import { PickerModal } from "@/components/ui/PickerModal";
import { CodeStickerCard } from "@/components/ui/CodeStickerCard";
import { PhotoPicker } from "@/components/ui/PhotoPicker";

import { PROPERTY_TYPES, formatDate, type PropertyStep } from "./types";

/** Methods exposed to the parent wizard via ref. */
export type PropertyInfoStepRef = {
  clearAddress: () => void;
};

type Props = {
  data: PropertyStep;
  onChange: (patch: Partial<PropertyStep>) => void;
  /** True while add.tsx is generating the property code after address selection. */
  codeLoading: boolean;
  /** Called by add.tsx when an address is selected — triggers code generation. */
  onAddressSelect: (place: PlaceResult) => void;
};

export const PropertyInfoStep = forwardRef<PropertyInfoStepRef, Props>(
  function PropertyInfoStep({ data, onChange, codeLoading, onAddressSelect }, ref) {
  const addressRef = useRef<AddressSearchRef>(null);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const selectedTypeLabel =
    PROPERTY_TYPES.find((t) => t.value === data.propertyType)?.label ??
    "Select…";

  useImperativeHandle(ref, () => ({
    clearAddress: () => addressRef.current?.clear(),
  }));
  return (
    <View style={styles.container}>
      {/* Address — dropdown is absolutely positioned and overlays content below */}
      <OutlinedField label="Address" required style={styles.addressField}>
        <AddressSearch
          ref={addressRef}
          placeholder="Search address…"
          onSelect={(place) => {
            onChange({ selectedPlace: place, propertyCode: null });
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
        onChangeText={(v) => onChange({ landlordName: v })}
        autoCapitalize="words"
      />

      {/* Landlord Contact (phone) + Date Received — inline row */}
      <View style={styles.inlineRow}>
        <Input
          label="Landlord Contact"
          placeholder="Phone number"
          value={data.landlordContact}
          onChangeText={(v) => onChange({ landlordContact: v })}
          keyboardType="phone-pad"
          containerStyle={styles.phoneField}
        />
        <OutlinedDateField
          label="Date Received"
          value={formatDate(data.dateReceived)}
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

      {/* Photos */}
      <View style={styles.photoSection}>
        <PhotoPicker
          uris={data.photoUris}
          onChange={(uris) => onChange({ photoUris: uris })}
          label="Photos – Master Set"
          hint="Tap to add photos of keys received"
        />
      </View>

      {/* Property Code / Sticker Card — shown once an address has been selected */}
      {(data.selectedPlace || codeLoading) && (
        <View style={styles.stickerCardSpacing}>
          <CodeStickerCard
            title="Property Code"
            code={data.propertyCode}
            loading={codeLoading}
          />
        </View>
      )}
    </View>
  );
});

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
  phoneField: {
    flex: 1,
    marginTop: 10,
  },
  dateField: {
    width: 155,
  },
  photoSection: {
    marginTop: theme.spacing.md,
  },
  stickerCardSpacing: {
    marginTop: theme.spacing.md,
  },
});

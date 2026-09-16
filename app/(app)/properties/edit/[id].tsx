import { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  AddressSearch,
  BottomSheet,
  Button,
  ErrorState,
  FormFooter,
  FormSection,
  Input,
  LoadingState,
  OutlinedDateField,
  OutlinedSelect,
  PickerModal,
  Toggle,
  type ToggleOption,
} from "@/components/ui";
import {
  PropertyKeysSection,
  usePropertyEditForm,
} from "@/components/property/edit";
import {
  normalizePropertyDecimalInput,
  normalizePropertyIntegerInput,
} from "@/components/property/add/propertyForm";
import { PROPERTY_TYPES, theme } from "@/constants";
import { useDeveloperSuggestions } from "@/lib/hooks";
import { formatDate } from "@/lib/utils";
import type { RentalStatus } from "@/types";

const RENTAL_STATUS_OPTIONS: readonly [
  ToggleOption<RentalStatus>,
  ToggleOption<RentalStatus>,
] = [
  { value: "short", label: "Short Term" },
  { value: "long", label: "Long Term" },
];

// ── Screen ────────────────────────────────────────────────────────────────────

export default function EditPropertyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [devFocused, setDevFocused] = useState(false);

  const form = usePropertyEditForm(id);

  const { suggestions: devSuggestions, clear: clearDevSuggestions } =
    useDeveloperSuggestions(devFocused ? form.developerName : "");

  if (form.propertyLoading) return <LoadingState message="Loading property…" />;
  if (form.isError || !form.property) {
    return (
      <ErrorState
        title="Property not found"
        message="Could not load this property."
        onRetry={form.refetch}
      />
    );
  }

  const selectedTypeLabel =
    PROPERTY_TYPES.find((t) => t.value === form.propertyType)?.label ??
    "Select…";

  return (
    <>
      <View style={styles.screen}>
        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: theme.spacing.md },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          bottomOffset={Platform.OS === "ios" ? 32 : 16}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Property Details ──────────────────────────────────────────── */}
          <FormSection title="Property Details" cardStyle={styles.cardNoGap}>
            <View style={styles.addressField}>
              <AddressSearch
                label="Address"
                mode="full"
                labelBackground={theme.colors.surface}
                initialValue={form.property.formatted_address ?? ""}
                onSelect={form.onAddressSelect}
              />
              {form.addressChecking && (
                <View style={styles.addressFeedbackRow}>
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.textMuted}
                  />
                  <Text style={styles.addressCheckingText}>
                    Checking address…
                  </Text>
                </View>
              )}
              {form.addressError ? (
                <View style={styles.addressFeedbackRow}>
                  <Text style={styles.addressErrorText}>
                    {form.addressError}
                  </Text>
                </View>
              ) : null}
            </View>

            <Input
              label="Title"
              placeholder="Optional custom title"
              value={form.title}
              onChangeText={form.setTitle}
              autoCapitalize="words"
              autoCorrect={false}
              labelBackground={theme.colors.surface}
              onFocus={() => {
                setDevFocused(false);
                setShowDatePicker(false);
              }}
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

          <FormSection
            title="Building & Management"
            cardStyle={styles.cardNoGap}
          >
            <View style={styles.inlineRow}>
              <View style={styles.flexField}>
                <Input
                  label="Developer Name"
                  value={form.developerName}
                  onChangeText={form.setDeveloperName}
                  autoCapitalize="words"
                  autoCorrect={false}
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
                          form.setDeveloperName(name);
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
                value={form.consultantName}
                onChangeText={form.setConsultantName}
                autoCapitalize="words"
                containerStyle={styles.flexField}
                labelBackground={theme.colors.surface}
              />
            </View>

            <View style={styles.inlineRow}>
              <Input
                label="Lot #"
                value={form.lotNumber}
                onChangeText={form.setLotNumber}
                autoCapitalize="characters"
                containerStyle={styles.flexField}
                labelBackground={theme.colors.surface}
              />
              <Input
                label="MAA Fee"
                value={form.maaFee}
                onChangeText={(value) =>
                  form.setMaaFee(normalizePropertyDecimalInput(value))
                }
                keyboardType="decimal-pad"
                maxLength={13}
                containerStyle={styles.flexField}
                labelBackground={theme.colors.surface}
              />
              <Input
                label="Cabinet Slot"
                value={form.cabinetCode}
                onChangeText={form.setCabinetCode}
                autoCapitalize="characters"
                containerStyle={styles.cabinetInput}
                labelBackground={theme.colors.surface}
              />
            </View>

            <Toggle
              label="Rental Status"
              options={RENTAL_STATUS_OPTIONS}
              value={form.rentalStatus}
              onChange={form.setRentalStatus}
            />
          </FormSection>

          <FormSection title="Property Features" cardStyle={styles.cardNoGap}>
            <View style={styles.inlineRow}>
              <Input
                label="Bedrooms"
                value={form.bedrooms}
                onChangeText={(value) =>
                  form.setBedrooms(normalizePropertyIntegerInput(value))
                }
                keyboardType="number-pad"
                maxLength={3}
                containerStyle={styles.flexField}
                labelBackground={theme.colors.surface}
              />
              <Input
                label="Bathrooms"
                value={form.bathrooms}
                onChangeText={(value) =>
                  form.setBathrooms(normalizePropertyIntegerInput(value))
                }
                keyboardType="number-pad"
                maxLength={3}
                containerStyle={styles.flexField}
                labelBackground={theme.colors.surface}
              />
              <Input
                label="Carparks"
                value={form.carparks}
                onChangeText={(value) =>
                  form.setCarparks(normalizePropertyIntegerInput(value))
                }
                keyboardType="number-pad"
                maxLength={3}
                containerStyle={styles.flexField}
                labelBackground={theme.colors.surface}
              />
            </View>

            <Input
              label="Parking Location"
              value={form.parkingLocation}
              onChangeText={form.setParkingLocation}
              autoCapitalize="sentences"
              labelBackground={theme.colors.surface}
            />
            <Input
              label="Storage Location"
              value={form.storageLocation}
              onChangeText={form.setStorageLocation}
              autoCapitalize="sentences"
              labelBackground={theme.colors.surface}
            />
          </FormSection>

          <FormSection title="Property Notes" cardStyle={styles.cardNoGap}>
            <Input
              label="Defects"
              placeholder="Record any known defects"
              value={form.defects}
              onChangeText={form.setDefects}
              multiline
              maxLength={2000}
              labelBackground={theme.colors.surface}
            />
            <Input
              label="Notes"
              placeholder="Amenities and other useful information"
              value={form.notes}
              onChangeText={form.setNotes}
              multiline
              maxLength={2000}
              labelBackground={theme.colors.surface}
            />
          </FormSection>

          {/* ── Landlord Information ──────────────────────────────────────── */}
          <FormSection
            title="Landlord Information"
            cardStyle={styles.cardNoGap}
          >
            <Input
              label="Landlord / Owner"
              placeholder="Full name"
              value={form.landlordName}
              onChangeText={form.setLandlordName}
              autoCapitalize="words"
              autoCorrect={false}
              labelBackground={theme.colors.surface}
              onFocus={() => setShowDatePicker(false)}
            />
            <View style={styles.inlineRow}>
              <Input
                label="Landlord Contact"
                placeholder="Phone number"
                value={form.landlordContact}
                onChangeText={form.setLandlordContact}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                containerStyle={styles.phoneField}
                labelBackground={theme.colors.surface}
                onFocus={() => setShowDatePicker(false)}
              />
              <OutlinedDateField
                label="Date Received"
                value={formatDate(form.dateReceived.toISOString())}
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

          {/* ── Tenant Information (leased only) ──────────────────────────── */}
          {form.isLeased && (
            <FormSection
              title="Tenant Information"
              cardStyle={styles.cardNoGap}
            >
              <Input
                label="Tenant"
                placeholder="Full name"
                value={form.tenantName}
                onChangeText={form.setTenantName}
                autoCapitalize="words"
                autoCorrect={false}
                labelBackground={theme.colors.surface}
                onFocus={() => setShowDatePicker(false)}
              />
              <Input
                label="Tenant Contact"
                placeholder="Phone number"
                value={form.tenantPhone}
                onChangeText={form.setTenantPhone}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                labelBackground={theme.colors.surface}
                onFocus={() => setShowDatePicker(false)}
              />
            </FormSection>
          )}

          <PropertyKeysSection
            displayKeys={form.displayKeys}
            totalKeys={form.totalKeys}
            onChangeQty={form.changeQty}
            onDelete={form.deleteKey}
            onAdd={form.addKey}
          />
        </KeyboardAwareScrollView>

        <FormFooter
          onCancel={() => router.back()}
          onSave={() => form.save(() => router.back())}
          saving={form.isPending}
          saveDisabled={form.addressChecking || !!form.addressError}
        />
      </View>

      <BottomSheet
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
      >
        <DateTimePicker
          value={form.dateReceived}
          mode="date"
          display="spinner"
          textColor={theme.colors.text}
          themeVariant="light"
          maximumDate={new Date()}
          onValueChange={(_, selected) => form.setDateReceived(selected)}
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

      <PickerModal
        visible={showTypePicker}
        title="Property Type"
        options={PROPERTY_TYPES}
        value={form.propertyType}
        onSelect={(v) => form.setPropertyType(v)}
        onClose={() => setShowTypePicker(false)}
      />
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.md,
  },

  // Property/landlord/tenant cards rely on each field's own top margin for
  // spacing, so opt out of FormSection's default gap.
  cardNoGap: { gap: 0 },

  // ── Field helpers ─────────────────────────────────────────────────────────
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
  phoneField: { flex: 1, marginTop: 10 },
  dateField: { width: 155 },
  datePicker: { width: "100%" },
  datePickerActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  datePickerBtn: { flex: 1 },
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

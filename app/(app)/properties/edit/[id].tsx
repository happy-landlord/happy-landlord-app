import { useState } from "react";
import { ActivityIndicator, Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import { AddressSearch, Button, ErrorState, Input, LoadingState, OutlinedSelect, PickerModal } from "@/components/ui";
import { PropertyKeysSection, usePropertyEditForm } from "@/components/property/edit";
import { PROPERTY_TYPES, theme } from "@/constants";
import { useDeveloperSuggestions } from "@/lib/hooks";


// ── Screen ────────────────────────────────────────────────────────────────────

export default function EditPropertyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showTypePicker, setShowTypePicker] = useState(false);
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
    PROPERTY_TYPES.find((t) => t.value === form.propertyType)?.label ?? "Select…";

  return (
    <>
      <View style={styles.screen}>
        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: theme.spacing.md }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          bottomOffset={Platform.OS === "ios" ? 32 : 16}
          showsVerticalScrollIndicator={false}
        >
          <View>
            <AddressSearch
              label="Address"
              mode="full"
              labelBackground={theme.colors.background}
              initialValue={form.property.formatted_address ?? ""}
              onSelect={form.onAddressSelect}
            />
            {form.addressChecking && (
              <View style={styles.addressStatus}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.addressChecking}>Checking address…</Text>
              </View>
            )}
            {form.addressError ? (
              <Text style={styles.addressError}>{form.addressError}</Text>
            ) : null}
          </View>

          <OutlinedSelect
            label="Property Type"
            required
            value={selectedTypeLabel}
            focused={showTypePicker}
            onPress={() => setShowTypePicker(true)}
          />

          <Input
            label="Landlord / Owner"
            placeholder="Full name"
            value={form.landlordName}
            onChangeText={form.setLandlordName}
            autoCapitalize="words"
            autoCorrect={false}
            labelBackground={theme.colors.background}
          />
          <Input
            label="Landlord Contact"
            placeholder="Phone number"
            value={form.landlordContact}
            onChangeText={form.setLandlordContact}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            labelBackground={theme.colors.background}
          />

          {/* Developer Name + Cabinet Slot */}
          <View style={styles.inlineRow}>
            <View style={{ flex: 1 }}>
              <Input
                label="Developer Name"
                placeholder="Optional"
                value={form.developerName}
                onChangeText={form.setDeveloperName}
                autoCapitalize="words"
                autoCorrect={false}
                labelBackground={theme.colors.background}
                onFocus={() => setDevFocused(true)}
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
                        form.setDeveloperName(name);
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
              placeholder="Optional"
              value={form.cabinetCode}
              onChangeText={form.setCabinetCode}
              autoCapitalize="characters"
              containerStyle={{ width: 130 }}
              labelBackground={theme.colors.background}
              onFocus={() => setDevFocused(false)}
            />
          </View>

          {form.isLeased && (
            <>
              <Input
                label="Tenant"
                placeholder="Full name"
                value={form.tenantName}
                onChangeText={form.setTenantName}
                autoCapitalize="words"
                autoCorrect={false}
                labelBackground={theme.colors.background}
              />
              <Input
                label="Tenant Contact"
                placeholder="Phone number"
                value={form.tenantPhone}
                onChangeText={form.setTenantPhone}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                labelBackground={theme.colors.background}
              />
            </>
          )}

          <PropertyKeysSection
            displayKeys={form.displayKeys}
            totalKeys={form.totalKeys}
            onChangeQty={form.changeQty}
            onDelete={form.deleteKey}
            onAdd={form.addKey}
          />
        </KeyboardAwareScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + theme.spacing.sm }]}>
          <Button
            title="Cancel"
            variant="outline"
            onPress={() => router.back()}
            disabled={form.isPending}
            style={styles.cancelBtn}
          />
          <Button
            title="Save"
            variant="primary"
            loading={form.isPending}
            disabled={form.isPending || form.addressChecking || !!form.addressError}
            onPress={() => form.save(() => router.back())}
            style={styles.saveBtn}
          />
        </View>
      </View>

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
  footer: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  cancelBtn: { flex: 1 },
  saveBtn: { flex: 2 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.sm,
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
  suggestionRowPressed: { backgroundColor: theme.colors.neutralSoft },
  suggestionText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: "500",
  },
  addressStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    marginLeft: 2,
  },
  addressChecking: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  addressError: {
    fontSize: 12,
    color: theme.colors.danger,
    marginTop: 4,
    marginLeft: 2,
  },
});

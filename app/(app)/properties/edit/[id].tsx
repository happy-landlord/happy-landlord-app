import { useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Button, ErrorState, Input, LoadingState, OutlinedSelect, PickerModal } from "@/components/ui";
import { PropertyKeysSection, usePropertyEditForm } from "@/components/property/edit";
import { PROPERTY_TYPES, theme } from "@/constants";


// ── Screen ────────────────────────────────────────────────────────────────────

export default function EditPropertyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showTypePicker, setShowTypePicker] = useState(false);

  const form = usePropertyEditForm(id);

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
            disabled={form.isPending}
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
});

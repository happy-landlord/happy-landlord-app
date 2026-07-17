import { Platform, StyleSheet, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  ErrorState,
  FormFooter,
  FormSection,
  Input,
  LoadingState,
  PhotoPicker,
} from "@/components/ui";
import { KeyListSection, useKeySetEditForm } from "@/components/keyset";
import { theme } from "@/constants";

// ── Screen ────────────────────────────────────────────────────────────────────

export default function EditKeySetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const {
    keySet,
    keySetLoading,
    isError,
    refetch,
    keyAssignment,
    pendingName,
    setPendingName,
    cabinetSlot,
    setCabinetSlot,
    photoUris,
    setPhotoUris,
    isSaving,
    save,
  } = useKeySetEditForm(id);

  // ── Render ────────────────────────────────────────────────────────────────
  if (keySetLoading) return <LoadingState message="Loading keyset…" />;
  if (isError || !keySet) {
    return (
      <ErrorState
        title="Keyset not found"
        message="Could not load this keyset."
        onRetry={refetch}
      />
    );
  }

  return (
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
        {/* ── Details ──────────────────────────────────────────────────────── */}
        <FormSection title="Keyset Details">
          <View style={styles.detailsRow}>
            <Input
              label="Name"
              required
              placeholder="e.g. Main Keyset"
              value={pendingName}
              onChangeText={setPendingName}
              autoCorrect={false}
              returnKeyType="done"
              maxLength={60}
              editable={!isSaving}
              containerStyle={styles.nameInput}
              labelBackground={theme.colors.surface}
            />
            <Input
              label="Cabinet Slot"
              placeholder="e.g. A3"
              value={cabinetSlot}
              onChangeText={setCabinetSlot}
              autoCapitalize="characters"
              maxLength={20}
              editable={!isSaving}
              containerStyle={styles.cabinetInput}
              labelBackground={theme.colors.surface}
            />
          </View>
        </FormSection>

        {/* ── Keys ─────────────────────────────────────────────────────────── */}
        <FormSection title="Keys">
          <KeyListSection
            label="Assigned"
            keys={keyAssignment.assigned}
            assigned
            onPressKey={keyAssignment.unassign}
            disabled={isSaving}
            emptyText="No keys assigned yet."
          />
          <KeyListSection
            label="Available to assign"
            keys={keyAssignment.unassigned}
            assigned={false}
            onPressKey={keyAssignment.assign}
            disabled={isSaving}
          />
        </FormSection>

        {/* ── Photos ───────────────────────────────────────────────────────── */}
        <PhotoPicker
          uris={photoUris}
          onChange={setPhotoUris}
          color={theme.colors.accent}
          label="Photos"
          hint="Tap to add photos of the keyset"
          compact
        />
      </KeyboardAwareScrollView>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <FormFooter
        onCancel={() => router.back()}
        onSave={() => save(() => router.back())}
        saving={isSaving}
      />
    </View>
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
  detailsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
  },
  nameInput: { flex: 1 },
  cabinetInput: { width: 110 },
});

import { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  FormFooter,
  FormSection,
  Input,
  PhotoPicker,
  ShareQrButton,
} from "@/components/ui";
import { KeyListSection } from "@/components/keyset";
import { theme } from "@/constants";
import { QUERY_KEYS } from "@/lib/query";
import {
  createKeySet,
  fetchNextKeySetSeq,
  updateKey,
  updateKeySetImages,
  uploadKeySetImages,
  type UnassignedKey,
} from "@/lib/services";
import { useProperty, useUnassignedKeys } from "@/lib/hooks";
import { keySetQrUrl, showErrorToast, showSuccessToast } from "@/lib/utils";

// ── Screen ────────────────────────────────────────────────────────────────────

export default function AddKeySetScreen() {
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: property } = useProperty(propertyId);
  const { data: unassigned = [] } = useUnassignedKeys(propertyId);

  // Prefetch the next sequence so we can show the QR share button
  const { data: nextSeq } = useQuery({
    queryKey: ["keySetNextSeq", propertyId],
    queryFn: () => fetchNextKeySetSeq(propertyId),
    enabled: !!propertyId,
    staleTime: 0,
  });

  // ── Form state ─────────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [cabinetSlot, setCabinetSlot] = useState("");
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<UnassignedKey[]>([]);

  const isSelected = (k: UnassignedKey) => selectedKeys.some((s) => s.id === k.id);

  function toggleKey(k: UnassignedKey) {
    setSelectedKeys((prev) =>
      isSelected(k) ? prev.filter((s) => s.id !== k.id) : [...prev, k],
    );
  }

  const availableKeys = unassigned.filter((k) => !isSelected(k));

  // Pre-computed QR code (used for the share button before save)
  const propertyCode = property?.property_code;
  const previewCode =
    propertyCode && nextSeq != null
      ? keySetQrUrl(`${propertyCode}-S${nextSeq}`)
      : null;

  // ── Save mutation ──────────────────────────────────────────────────────────
  const { mutate: doSave, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      const trimmedName = name.trim();
      if (!trimmedName) throw new Error("name_required");
      if (!propertyCode) throw new Error("no_property_code");

      // Re-fetch sequence at mutation time to avoid stale data
      const seq = await fetchNextKeySetSeq(propertyId);
      const code = `S${seq}`;

      const keySet = await createKeySet({
        property_id: propertyId,
        code,
        name: trimmedName,
        status: "available",
        qr_code: `${propertyCode}-${code}`,
        cabinet_slot: cabinetSlot.trim() || null,
      });

      if (selectedKeys.length > 0) {
        await Promise.all(
          selectedKeys.map((k) => updateKey(k.id, { key_set_id: keySet.id })),
        );
      }

      if (photoUris.length > 0) {
        const images = await uploadKeySetImages(propertyId, keySet.id, photoUris);
        await updateKeySetImages(keySet.id, images);
      }
    },
    onError: (err: Error) => {
      if (err.message === "name_required") {
        showErrorToast("Name required", "Please enter a name for this keyset.");
      } else {
        showErrorToast("Failed to create keyset", err.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.keySets.byProperty(propertyId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.keySets.unassigned(propertyId),
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      showSuccessToast("Keyset added");
      router.back();
    },
  });

  // ── Render ─────────────────────────────────────────────────────────────────
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
        <FormSection
          title="Keyset Details"
          action={
            <ShareQrButton
              variant="pill"
              code={previewCode ?? " "}
              title={name || "New Keyset"}
              disabled={!previewCode || isSaving}
            />
          }
        >
          {/* Name + Cabinet Slot in a row */}
          <View style={styles.detailsRow}>
            <Input
              label="Name"
              required
              placeholder="e.g. Main Keyset"
              value={name}
              onChangeText={setName}
              autoCorrect={false}
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
            keys={selectedKeys}
            assigned
            onPressKey={toggleKey}
            disabled={isSaving}
          />
          <KeyListSection
            label="Available to assign"
            keys={availableKeys}
            assigned={false}
            onPressKey={toggleKey}
            disabled={isSaving}
          />
          {availableKeys.length === 0 && selectedKeys.length === 0 && (
            <Text style={styles.emptyText}>
              No unassigned keys available for this property.
            </Text>
          )}
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
        onSave={() => doSave()}
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

  // Name + Cabinet Slot row
  detailsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
  },
  nameInput: { flex: 1 },
  cabinetInput: { width: 110 },

  emptyText: {
    fontSize: 13,
    color: theme.colors.textLight,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: theme.spacing.sm,
  },
});


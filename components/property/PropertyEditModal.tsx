import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Plus, X } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { PickerModal } from "@/components/ui/PickerModal";
import { theme } from "@/constants/theme";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { useUpdateProperty } from "@/hooks/useProperties";
import { usePropertyImageUrls } from "@/hooks/usePropertyImages";
import { useQueryClient } from "@tanstack/react-query";
import {
  createKeyHolder,
  getVisibleImages,
  updateKeyHolder,
  uploadPropertyImagesForEdit,
  type PropertyImage,
  type PropertyWithLandlord,
} from "@/services/properties.service";
import { PROPERTY_TYPES, type PropertyType } from "@/components/property/add/types";

// ── Thumb sizing ─────────────────────────────────────────────────────────────

const SCREEN_W = Dimensions.get("window").width;
const THUMB_GAP = 6;
const THUMB_SIZE = Math.floor((SCREEN_W - theme.spacing.screen * 2 - THUMB_GAP * 2) / 3);

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  property: PropertyWithLandlord;
  visible: boolean;
  onClose: () => void;
};

export function PropertyEditModal({ property, visible, onClose }: Props) {
  const queryClient = useQueryClient();
  const updateProperty = useUpdateProperty(property.id);

  // ── Draft state ────────────────────────────────────────────────────────────
  const [propertyType, setPropertyType] = useState<PropertyType>(property.property_type);
  const [landlordName, setLandlordName] = useState(property.landlord?.full_name ?? "");
  const [landlordContact, setLandlordContact] = useState(property.landlord?.phone ?? "");
  const [keptImages, setKeptImages] = useState<PropertyImage[]>([]);
  const [newPhotoUris, setNewPhotoUris] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);

  // Reset draft when modal opens so stale state is never shown
  useEffect(() => {
    if (visible) {
      setPropertyType(property.property_type);
      setLandlordName(property.landlord?.full_name ?? "");
      setLandlordContact(property.landlord?.phone ?? "");
      setKeptImages(getVisibleImages(property.images ?? []));
      setNewPhotoUris([]);
    }
  }, [visible, property]);

  // Signed URLs for existing images (from TQ cache — no extra network call)
  const { data: signedUrls = [] } = usePropertyImageUrls(property.images ?? []);

  // Map each kept image to its signed URL by matching path
  const allVisibleImages = getVisibleImages(property.images ?? []);
  function signedUrlFor(img: PropertyImage): string | null {
    const idx = allVisibleImages.findIndex((v) => v.path === img.path);
    return idx >= 0 ? (signedUrls[idx] ?? null) : null;
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  function removeKeptImage(path: string) {
    setKeptImages((prev) => prev.filter((img) => img.path !== path));
  }

  function removeNewPhoto(index: number) {
    setNewPhotoUris((prev) => prev.filter((_, i) => i !== index));
  }

  async function addPhotos() {
    Alert.alert("Add Photos", "Choose photo source", [
      {
        text: "Take Photo",
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (perm.status !== "granted") {
            Alert.alert("Permission required", "Allow camera access in Settings.");
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: "images",
            quality: 0.85,
          });
          if (!result.canceled && result.assets[0]) {
            setNewPhotoUris((prev) => [...prev, result.assets[0].uri]);
          }
        },
      },
      {
        text: "Choose from Library",
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (perm.status !== "granted") {
            Alert.alert("Permission required", "Allow photo library access in Settings.");
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: "images",
            quality: 0.85,
            allowsMultipleSelection: true,
          });
          if (!result.canceled) {
            setNewPhotoUris((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function handleSave() {
    setSaving(true);
    try {
      // 1. Upload new photos
      let uploadedImages: PropertyImage[] = [];
      if (newPhotoUris.length > 0) {
        uploadedImages = await uploadPropertyImagesForEdit(
          property.id,
          newPhotoUris,
          keptImages.length + 1,
        );
      }

      // 2. Build final images array with correct sort_order
      const finalImages: PropertyImage[] = [
        ...keptImages.map((img, i) => ({ ...img, sort_order: i + 1 })),
        ...uploadedImages,
      ];

      // 3. Landlord: update existing or create new
      let landlordHolderId = property.landlord_holder_id ?? null;
      const hasLandlordData = Boolean(landlordName.trim() || landlordContact.trim());

      if (property.landlord?.id) {
        await updateKeyHolder(property.landlord.id, {
          full_name: landlordName.trim() || null,
          phone: landlordContact.trim() || null,
        });
      } else if (hasLandlordData) {
        const holder = await createKeyHolder({
          holder_type: "landlord",
          full_name: landlordName.trim() || null,
          phone: landlordContact.trim() || null,
        });
        landlordHolderId = holder.id;
      }

      // 4. Update property
      await updateProperty.mutateAsync({
        property_type: propertyType,
        images: finalImages,
        landlord_holder_id: landlordHolderId,
      });

      // 5. Bust signed URL cache for new images so they resolve immediately
      for (const img of uploadedImages) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.storage.signedUrl(img.path),
        });
      }
      // Also invalidate the bulk signed URLs query for this property
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.storage.signedUrls(
          allVisibleImages.map((i) => i.path),
        ),
      });

      onClose();
    } catch (err) {
      Alert.alert(
        "Save failed",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  const selectedTypeLabel =
    PROPERTY_TYPES.find((t) => t.value === propertyType)?.label ?? "Select…";

  const totalPhotos = keptImages.length + newPhotoUris.length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <BottomSheet
        visible={visible}
        onClose={onClose}
        containerStyle={styles.sheet}
      >
        {/* Drag handle is shown by BottomSheet automatically */}

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Edit Property</Text>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <X size={18} color={theme.colors.text} strokeWidth={2.2} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Property type ─────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Property Type</Text>
            <Pressable
              onPress={() => setShowTypePicker(true)}
              style={({ pressed }) => [styles.selectField, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.selectText}>{selectedTypeLabel}</Text>
              <Text style={styles.selectChevron}>›</Text>
            </Pressable>
          </View>

          {/* ── Landlord ──────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Landlord</Text>
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.input}
                value={landlordName}
                onChangeText={setLandlordName}
                placeholder="Full name"
                placeholderTextColor={theme.colors.textLight}
                autoCapitalize="words"
                autoCorrect={false}
              />
              <View style={styles.inputDivider} />
              <TextInput
                style={styles.input}
                value={landlordContact}
                onChangeText={setLandlordContact}
                placeholder="Phone number"
                placeholderTextColor={theme.colors.textLight}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
              />
            </View>
          </View>

          {/* ── Photos ────────────────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>Photos</Text>
              {totalPhotos > 0 && (
                <Text style={styles.photoCount}>{totalPhotos} photo{totalPhotos === 1 ? "" : "s"}</Text>
              )}
            </View>

            <View style={styles.photoGrid}>
              {/* Existing (kept) images */}
              {keptImages.map((img) => {
                const url = signedUrlFor(img);
                return (
                  <View key={img.path} style={styles.thumb}>
                    {url ? (
                      <Image
                        source={{ uri: url }}
                        style={styles.thumbImg}
                        contentFit="cover"
                        transition={150}
                      />
                    ) : (
                      <View style={[styles.thumbImg, styles.thumbPlaceholder]} />
                    )}
                    <Pressable
                      style={styles.thumbRemove}
                      onPress={() => removeKeptImage(img.path)}
                      hitSlop={4}
                      accessibilityRole="button"
                      accessibilityLabel="Remove photo"
                    >
                      <X size={11} color="#fff" strokeWidth={3} />
                    </Pressable>
                  </View>
                );
              })}

              {/* New (local) images */}
              {newPhotoUris.map((uri, i) => (
                <View key={`new-${i}`} style={[styles.thumb, styles.thumbNew]}>
                  <Image
                    source={{ uri }}
                    style={styles.thumbImg}
                    contentFit="cover"
                    transition={150}
                  />
                  <Pressable
                    style={styles.thumbRemove}
                    onPress={() => removeNewPhoto(i)}
                    hitSlop={4}
                    accessibilityRole="button"
                    accessibilityLabel="Remove photo"
                  >
                    <X size={11} color="#fff" strokeWidth={3} />
                  </Pressable>
                </View>
              ))}

              {/* Add photos tile */}
              <Pressable
                style={({ pressed }) => [styles.addTile, pressed && { opacity: 0.7 }]}
                onPress={addPhotos}
                accessibilityRole="button"
                accessibilityLabel="Add photo"
              >
                <View style={styles.addIcon}>
                  <Plus size={18} color={theme.colors.primary} strokeWidth={2} />
                </View>
                <Text style={styles.addLabel}>Add</Text>
              </Pressable>
            </View>
          </View>

          {/* ── Save button ───────────────────────────────────────────── */}
          <Pressable
            style={({ pressed }) => [
              styles.saveBtn,
              pressed && { opacity: 0.82 },
              saving && { opacity: 0.6 },
            ]}
            onPress={handleSave}
            disabled={saving}
            accessibilityRole="button"
          >
            {saving ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.saveBtnLabel}>
                  {newPhotoUris.length > 0 ? `Uploading ${newPhotoUris.length} photo${newPhotoUris.length === 1 ? "" : "s"}…` : "Saving…"}
                </Text>
              </>
            ) : (
              <Text style={styles.saveBtnLabel}>Save changes</Text>
            )}
          </Pressable>
        </ScrollView>
      </BottomSheet>

      {/* Type picker — rendered outside BottomSheet to avoid z-index issues */}
      <PickerModal
        visible={showTypePicker}
        title="Property Type"
        options={PROPERTY_TYPES}
        value={propertyType}
        onSelect={(v) => setPropertyType(v)}
        onClose={() => setShowTypePicker(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  sheet: {
    maxHeight: "90%",
    paddingHorizontal: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.screen,
    paddingBottom: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.text,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.neutralSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: theme.spacing.screen,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  section: { gap: theme.spacing.sm },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: theme.colors.textLight,
  },
  photoCount: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: "500",
  },

  // ── Property type select ──────────────────────────────────────────────────
  selectField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 13,
  },
  selectText: {
    fontSize: 15,
    color: theme.colors.text,
    fontWeight: "500",
  },
  selectChevron: {
    fontSize: 18,
    color: theme.colors.textMuted,
  },

  // ── Inputs ────────────────────────────────────────────────────────────────
  inputGroup: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    overflow: "hidden",
  },
  input: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 13,
    fontSize: 15,
    color: theme.colors.text,
  },
  inputDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: theme.spacing.md,
  },

  // ── Photo grid ────────────────────────────────────────────────────────────
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: THUMB_GAP,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: theme.radius.md,
    overflow: "hidden",
  },
  thumbNew: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  thumbImg: {
    width: "100%",
    height: "100%",
  },
  thumbPlaceholder: {
    backgroundColor: theme.colors.neutralSoft,
  },
  thumbRemove: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#E53935",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  addTile: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: theme.colors.primary + "88",
    backgroundColor: theme.colors.surfaceWarm,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  addLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.primary,
  },

  // ── Save button ───────────────────────────────────────────────────────────
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: 15,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    marginTop: theme.spacing.sm,
  },
  saveBtnLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.2,
  },
});


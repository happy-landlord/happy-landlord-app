import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyRound, Plus, X } from "lucide-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Button, ErrorState, LoadingState, PhotoPicker } from "@/components/ui";
import { KEY_TYPE_ICON, theme } from "@/constants";
import { getKeyName, getKeySignature } from "@/lib/utils";
import {
  useCreateKeys,
  useDeleteKey,
  useKeySet,
  useUnassignedKeys,
  useUpdateKey,
  useUpdateKeySet,
} from "@/lib/hooks";
import {
  fetchKeySetById,
  fetchSignedKeySetImageUrl,
  fetchUnassignedKeysForProperty,
  getVisibleKeySetImages,
  updateKeySetImages,
  uploadKeySetImages,
} from "@/lib/services";
import { QUERY_KEYS } from "@/lib/query";
import type { StoredImage } from "@/types";
import type { KeyInSet, UnassignedKey } from "@/lib/services";

// ── Screen ────────────────────────────────────────────────────────────────────

export default function EditKeySetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: keySet, isPending: keySetLoading, isError, refetch } = useKeySet(id);
  const propertyId = keySet?.property_id ?? "";

  const { data: unassignedKeys = [] } = useUnassignedKeys(propertyId);

  const updateKeySetMut = useUpdateKeySet(propertyId, id);
  const createKeysMut = useCreateKeys(propertyId);
  const updateKeyMut = useUpdateKey(propertyId);
  const deleteKeyMut = useDeleteKey(propertyId);

  const imageUpdateMut = useMutation({
    mutationFn: async ({
      newUris,
      kept,
    }: {
      newUris: string[];
      kept: StoredImage[];
    }) => {
      let allImages = [...kept];
      if (newUris.length > 0) {
        const uploaded = await uploadKeySetImages(propertyId, id, newUris);
        allImages = [...allImages, ...uploaded];
      }
      await updateKeySetImages(id, allImages);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.keySets.detail(id) });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.keySets.byProperty(propertyId),
      });
    },
  });

  // ── Name state ────────────────────────────────────────────────────────────
  const [pendingName, setPendingName] = useState(keySet?.name ?? "");
  const nameSyncedRef = useRef(false);
  useEffect(() => {
    if (keySet && !nameSyncedRef.current) {
      setPendingName(keySet.name ?? "");
      nameSyncedRef.current = true;
    }
  }, [keySet]);

  // ── Photo state ───────────────────────────────────────────────────────────
  // Single `photoUris` list fed to PhotoPicker.
  // Existing stored images are pre-seeded as signed URLs; new picks are local
  // file:// URIs. The ref map lets us tell them apart at save time.
  const existingImages = useMemo(
    () => getVisibleKeySetImages(keySet?.images ?? []),
    // Intentionally stable after first load — only read once
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [keySet?.id],
  );

  const existingUrlMapRef = useRef<Map<string, StoredImage>>(new Map());
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const photosSyncedRef = useRef(false);

  const { data: loadedSignedUrls } = useQuery({
    queryKey: ["storage", "keySet", "allSignedUrls", id],
    queryFn: async () => {
      const pairs = await Promise.all(
        existingImages.map(async (img) => ({
          url: await fetchSignedKeySetImageUrl(img.path),
          image: img,
        })),
      );
      return pairs.filter((p) => p.url !== null) as {
        url: string;
        image: StoredImage;
      }[];
    },
    enabled: existingImages.length > 0,
    staleTime: 1000 * 60 * 55,
  });

  useEffect(() => {
    if (photosSyncedRef.current) return;
    if (existingImages.length === 0) {
      photosSyncedRef.current = true;
    } else if (loadedSignedUrls) {
      const map = new Map<string, StoredImage>();
      const urls: string[] = [];
      loadedSignedUrls.forEach(({ url, image }) => {
        map.set(url, image);
        urls.push(url);
      });
      existingUrlMapRef.current = map;
      setPhotoUris(urls);
      photosSyncedRef.current = true;
    }
  }, [loadedSignedUrls, existingImages.length]);

  // ── Key assign / unassign (immediate) ────────────────────────────────────
  const actingRef = useRef(false);
  const [acting, setActing] = useState(false);

  async function freshUnassigned(): Promise<UnassignedKey[]> {
    return queryClient.fetchQuery({
      queryKey: QUERY_KEYS.keySets.unassigned(propertyId),
      queryFn: () => fetchUnassignedKeysForProperty(propertyId),
    });
  }
  async function freshAssigned(): Promise<KeyInSet[]> {
    const ks = await queryClient.fetchQuery({
      queryKey: QUERY_KEYS.keySets.detail(id),
      queryFn: () => fetchKeySetById(id),
    });
    return (ks?.keys ?? []) as KeyInSet[];
  }
  function matchBySig<
    T extends { key_type: string; label?: string | null; code?: string | null },
  >(
    list: T[],
    target: { key_type: string; label?: string | null; code?: string | null },
  ): T | undefined {
    const sig = getKeySignature(target);
    return list.find((x) => getKeySignature(x) === sig);
  }

  async function moveOne(
    source: KeyInSet | UnassignedKey,
    destList: (KeyInSet | UnassignedKey)[],
    destKeySetId: string | null,
  ) {
    const dest = matchBySig(destList, source);
    const srcQty = source.quantity ?? 1;
    if (srcQty > 1) {
      await updateKeyMut.mutateAsync({ keyId: source.id, patch: { quantity: srcQty - 1 } });
      if (dest) {
        await updateKeyMut.mutateAsync({ keyId: dest.id, patch: { quantity: (dest.quantity ?? 1) + 1 } });
      } else {
        await createKeysMut.mutateAsync([
          {
            property_id: propertyId,
            key_set_id: destKeySetId,
            key_type: source.key_type,
            label: source.label,
            code: source.code ?? null,
            quantity: 1,
            notes: null,
          },
        ]);
      }
      return;
    }
    if (dest) {
      await updateKeyMut.mutateAsync({ keyId: dest.id, patch: { quantity: (dest.quantity ?? 1) + 1 } });
      await deleteKeyMut.mutateAsync(source.id);
    } else {
      await updateKeyMut.mutateAsync({ keyId: source.id, patch: { key_set_id: destKeySetId } });
    }
  }

  async function runLocked(fn: () => Promise<void>) {
    if (actingRef.current) return;
    actingRef.current = true;
    setActing(true);
    try { await fn(); } finally { actingRef.current = false; setActing(false); }
  }

  function handleAssign(initial: UnassignedKey) {
    void runLocked(async () => {
      const pool = await freshUnassigned();
      const src = matchBySig(pool, initial);
      if (!src) return;
      const assigned = await freshAssigned();
      await moveOne(src, assigned, id);
    });
  }

  function handleUnassign(initial: KeyInSet) {
    void runLocked(async () => {
      const assigned = await freshAssigned();
      const src = assigned.find((x) => x.id === initial.id);
      if (!src) return;
      const pool = await freshUnassigned();
      await moveOne(src, pool, null);
    });
  }

  const keysBusy =
    acting ||
    createKeysMut.isPending ||
    updateKeyMut.isPending ||
    deleteKeyMut.isPending;

  // ── Save ──────────────────────────────────────────────────────────────────
  const isSaving = updateKeySetMut.isPending || imageUpdateMut.isPending;

  async function handleSave() {
    if (isSaving || !keySet) return;
    try {
      const trimmedName = pendingName.trim();
      if (trimmedName && trimmedName !== keySet.name) {
        await updateKeySetMut.mutateAsync({ name: trimmedName });
      }

      // Separate existing signed URLs (kept) from new local URIs (to upload)
      const urlMap = existingUrlMapRef.current;
      const keptImages: StoredImage[] = [];
      const newLocalUris: string[] = [];
      for (const uri of photoUris) {
        if (urlMap.has(uri)) {
          keptImages.push(urlMap.get(uri)!);
        } else {
          newLocalUris.push(uri);
        }
      }
      const imagesDirty =
        newLocalUris.length > 0 ||
        keptImages.length !== getVisibleKeySetImages(keySet.images ?? []).length;
      if (imagesDirty) {
        await imageUpdateMut.mutateAsync({ newUris: newLocalUris, kept: keptImages });
      }

      router.back();
    } catch {
      // stay on screen on error
    }
  }

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

  const assignedKeys = (keySet.keys ?? []) as KeyInSet[];

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
        {/* Name */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Name</Text>
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              value={pendingName}
              onChangeText={setPendingName}
              placeholder="Keyset name"
              placeholderTextColor={theme.colors.textLight}
              autoCorrect={false}
              returnKeyType="done"
              maxLength={60}
            />
          </View>
        </View>

        {/* Assigned keys */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Assigned keys</Text>
          {assignedKeys.length === 0 ? (
            <Text style={styles.emptyText}>No keys assigned yet.</Text>
          ) : (
            <View style={styles.keyList}>
              {assignedKeys.map((k) => {
                const Icon = KEY_TYPE_ICON[k.key_type] ?? KeyRound;
                return (
                  <View key={k.id} style={styles.keyRow}>
                    <View style={styles.keyIconCircle}>
                      <Icon size={13} color={theme.colors.accent} strokeWidth={1.8} />
                    </View>
                    <View style={styles.keyInfo}>
                      <Text style={styles.keyLabel} numberOfLines={1}>
                        {getKeyName(k)}
                      </Text>
                      {k.code ? (
                        <View style={styles.codeChip}>
                          <Text style={styles.codeChipText}>{k.code}</Text>
                        </View>
                      ) : null}
                    </View>
                    {(k.quantity ?? 1) > 1 && (
                      <View style={styles.qtyChip}>
                        <Text style={styles.qtyChipText}>{k.quantity}</Text>
                      </View>
                    )}
                    <Pressable
                      onPress={() => handleUnassign(k)}
                      disabled={keysBusy}
                      hitSlop={8}
                      style={({ pressed }) => [
                        styles.removeBtn,
                        pressed && { opacity: 0.65 },
                      ]}
                    >
                      <X size={14} color={theme.colors.danger} strokeWidth={2.5} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Available to assign */}
        {unassignedKeys.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Available to assign</Text>
            <View style={styles.keyList}>
              {unassignedKeys.map((k) => {
                const Icon = KEY_TYPE_ICON[k.key_type] ?? KeyRound;
                return (
                  <View key={k.id} style={styles.keyRow}>
                    <View style={styles.keyIconCircle}>
                      <Icon size={13} color={theme.colors.accent} strokeWidth={1.8} />
                    </View>
                    <View style={styles.keyInfo}>
                      <Text style={styles.keyLabel} numberOfLines={1}>
                        {getKeyName(k)}
                      </Text>
                      {k.code ? (
                        <View style={styles.codeChip}>
                          <Text style={styles.codeChipText}>{k.code}</Text>
                        </View>
                      ) : null}
                    </View>
                    {(k.quantity ?? 1) > 1 && (
                      <View style={styles.qtyChip}>
                        <Text style={styles.qtyChipText}>{k.quantity}</Text>
                      </View>
                    )}
                    <Pressable
                      onPress={() => handleAssign(k)}
                      disabled={keysBusy}
                      hitSlop={8}
                      style={({ pressed }) => [
                        styles.addBtn,
                        pressed && { opacity: 0.65 },
                      ]}
                    >
                      {keysBusy ? (
                        <ActivityIndicator size={13} color={theme.colors.success} />
                      ) : (
                        <Plus size={14} color={theme.colors.success} strokeWidth={2.5} />
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Photos — bottom of scroll, same pattern as KeySetsStep */}
        <View style={styles.photoSection}>
          <PhotoPicker
            uris={photoUris}
            onChange={setPhotoUris}
            color={theme.colors.accent}
            label="Keyset Photos"
            hint="Tap to add photos of the keyset"
            compact
          />
        </View>
      </KeyboardAwareScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + theme.spacing.sm }]}>
        <Button
          title="Cancel"
          variant="outline"
          onPress={() => router.back()}
          disabled={isSaving}
          style={styles.cancelBtn}
        />
        <Button
          title="Save"
          variant="primary"
          loading={isSaving}
          disabled={isSaving}
          onPress={handleSave}
          style={styles.saveBtn}
        />
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  section: { gap: theme.spacing.sm },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: theme.colors.textLight,
  },
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
  // keys
  keyList: { gap: 6 },
  keyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  keyIconCircle: {
    width: 30,
    height: 30,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  keyInfo: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  keyLabel: { fontSize: 13, fontWeight: "600", color: theme.colors.text, flexShrink: 1 },
  codeChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.neutralSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexShrink: 0,
  },
  codeChipText: { fontSize: 10, fontWeight: "700", color: theme.colors.textMuted },
  qtyChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.neutralSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexShrink: 0,
  },
  qtyChipText: { fontSize: 11, fontWeight: "700", color: theme.colors.textMuted },
  removeBtn: {
    width: 30,
    height: 30,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.successSoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textLight,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: theme.spacing.sm,
  },
  // Photos section — matches KeySetsStep's photoSection
  photoSection: {
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  // Footer
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
});

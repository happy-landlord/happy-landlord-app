import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useSyncOnce } from "@/hooks";
import {
  useKeySet,
  useKeySetAssignment,
  useUnassignedKeys,
  useUpdateKeySet,
} from "@/lib/hooks";
import {
  fetchSignedKeySetImageUrl,
  getVisibleKeySetImages,
  updateKeySetImages,
  uploadKeySetImages,
} from "@/lib/services";
import { QUERY_KEYS } from "@/lib/query";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import type { StoredImage } from "@/types";
import type { KeyInSet } from "@/lib/services";

/**
 * Encapsulates all state, server sync and save orchestration for the
 * "edit keyset" screen, mirroring `usePropertyEditForm`. The screen stays
 * purely presentational.
 *
 * Three independent slices of state are managed and applied on save:
 *  - name           → `useUpdateKeySet`
 *  - key assignment → `useKeySetAssignment.applyDiff()` (diff-based batch)
 *  - photos         → `imageUpdateMut` (upload new + persist kept set)
 */
export function useKeySetEditForm(keySetId: string) {
  const queryClient = useQueryClient();

  const {
    data: keySet,
    isPending: keySetLoading,
    isError,
    refetch,
  } = useKeySet(keySetId);
  const propertyId = keySet?.property_id ?? "";

  const { data: serverUnassigned = [], isSuccess: unassignedReady } =
    useUnassignedKeys(propertyId);

  const keyAssignment = useKeySetAssignment({
    keySetId,
    propertyId,
    serverAssigned: (keySet?.keys ?? []) as KeyInSet[],
    serverUnassigned,
    ready: !!keySet && unassignedReady,
  });

  const updateKeySetMut = useUpdateKeySet(propertyId, keySetId);

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
        const uploaded = await uploadKeySetImages(propertyId, keySetId, newUris);
        allImages = [...allImages, ...uploaded];
      }
      await updateKeySetImages(keySetId, allImages);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.keySets.detail(keySetId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.keySets.byProperty(propertyId),
      });
    },
  });

  // ── Name state ────────────────────────────────────────────────────────────
  const [pendingName, setPendingName] = useState("");
  useSyncOnce(keySet, (ks) => setPendingName(ks.name ?? ""));

  // ── Photo state ───────────────────────────────────────────────────────────
  const existingImages = useMemo(
    () => getVisibleKeySetImages(keySet?.images ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [keySet?.id],
  );

  const existingUrlMapRef = useRef<Map<string, StoredImage>>(new Map());
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const photosSyncedRef = useRef(false);

  const { data: loadedSignedUrls } = useQuery({
    queryKey: ["storage", "keySet", "allSignedUrls", keySetId],
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

  // ── Save ──────────────────────────────────────────────────────────────────
  const isSaving =
    updateKeySetMut.isPending ||
    imageUpdateMut.isPending ||
    keyAssignment.isPending;

  async function save(onSuccess: () => void) {
    if (isSaving || !keySet) return;

    const trimmedName = pendingName.trim();
    if (!trimmedName) {
      showErrorToast("Name required", "Please enter a keyset name.");
      return;
    }

    try {
      if (trimmedName !== keySet.name) {
        await updateKeySetMut.mutateAsync({ name: trimmedName });
      }

      await keyAssignment.applyDiff();

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
        await imageUpdateMut.mutateAsync({
          newUris: newLocalUris,
          kept: keptImages,
        });
      }

      showSuccessToast("Keyset updated");
      onSuccess();
    } catch {
      // stay on screen on error; the global mutation handler shows a toast
    }
  }

  return {
    keySet,
    keySetLoading,
    isError,
    refetch,
    keyAssignment,
    pendingName,
    setPendingName,
    photoUris,
    setPhotoUris,
    isSaving,
    save,
  };
}


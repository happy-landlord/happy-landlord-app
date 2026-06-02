import { useQuery } from "@tanstack/react-query";

import type { StoredImage } from "@/types";
import {
  fetchSignedKeySetImageUrl,
  getVisibleKeySetImages,
} from "@/lib/services";

const SIGNED_URL_STALE_MS = 1000 * 60 * 55;
const SIGNED_URL_GC_MS = 1000 * 60 * 65;

/**
 * Returns a signed URL for the first visible keyset image.
 */
export function useFirstKeySetImageUrl(
  images: StoredImage[] | null | undefined,
) {
  const firstPath = getVisibleKeySetImages(images ?? [])[0]?.path ?? null;

  return useQuery({
    queryKey: ["storage", "keySet", "signedUrl", firstPath ?? ""],
    queryFn: () => fetchSignedKeySetImageUrl(firstPath!),
    enabled: Boolean(firstPath),
    staleTime: SIGNED_URL_STALE_MS,
    gcTime: SIGNED_URL_GC_MS,
  });
}

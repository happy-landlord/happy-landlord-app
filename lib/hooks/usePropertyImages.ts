import { useQuery } from "@tanstack/react-query";

import type { StoredImage } from "@/types/database";
import { QUERY_KEYS } from "@/lib/query/keys";
import {
  fetchSignedPropertyImageUrl,
  fetchSignedPropertyImageUrls,
  getVisibleImages,
} from "@/lib/services/properties.service";

/**
 * How long to keep signed URLs fresh in the TanStack Query cache.
 * Set to 55 min so queries refresh well before the 1-hour Supabase expiry.
 */
const SIGNED_URL_STALE_MS = 1000 * 60 * 55;
const SIGNED_URL_GC_MS = 1000 * 60 * 65;

/**
 * Returns a signed URL for the first visible property image.
 * Use this in list-view cards where only one thumbnail is needed.
 */
export function useFirstPropertyImageUrl(images: StoredImage[]) {
  const firstPath = getVisibleImages(images)[0]?.path ?? null;

  return useQuery({
    queryKey: QUERY_KEYS.storage.signedUrl(firstPath ?? ""),
    queryFn: () => fetchSignedPropertyImageUrl(firstPath!),
    enabled: Boolean(firstPath),
    staleTime: SIGNED_URL_STALE_MS,
    gcTime: SIGNED_URL_GC_MS,
  });
}

/**
 * Returns signed URLs for ALL visible images of a property in sort order.
 * Use this in the detail header / gallery where every image is needed.
 */
export function usePropertyImageUrls(images: StoredImage[]) {
  const visible = getVisibleImages(images);
  const paths = visible.map((img) => img.path);
  const key = paths.join(",");

  return useQuery({
    queryKey: QUERY_KEYS.storage.signedUrls(paths),
    queryFn: () => fetchSignedPropertyImageUrls(paths),
    enabled: paths.length > 0,
    staleTime: SIGNED_URL_STALE_MS,
    gcTime: SIGNED_URL_GC_MS,
    // Re-run when the set of paths changes (e.g. after upload)
    queryHash: `storage-signedUrls-${key}`,
  });
}

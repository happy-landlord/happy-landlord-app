/**
 * imageCompression.ts
 *
 * Centralised image compression utility using expo-image-manipulator.
 *
 * Goals:
 *  - Reduce upload sizes to fit 2 000+ photos in ~1 GB storage.
 *  - Apply a single resize + JPEG quality pass so every upload path stays
 *    consistent without duplicating logic across services.
 *
 * Typical results (modern 12 MP phone camera):
 *  - Original : 4 000 × 3 000 px  ~  3–5 MB
 *  - Keyset   : 1 200 × 900  px  ~ 150–300 KB  (≈ 15× savings)
 *  - Avatar   :   400 × 400  px  ~  30–60  KB  (≈ 60× savings)
 *
 * Average per keyset photo at ~200 KB → 2 000 photos ≈ 400 MB.
 */

import * as ImageManipulator from "expo-image-manipulator";

// ── Preset profiles ──────────────────────────────────────────────────────────

/** Settings for keyset and property photos (landscape / square). */
const PHOTO_PRESET = {
  maxWidth: 1200,
  quality: 0.75,
} as const;

/** Settings for square profile avatars. */
const AVATAR_PRESET = {
  maxWidth: 400,
  quality: 0.78,
} as const;

// ── Public API ───────────────────────────────────────────────────────────────

export type CompressOptions = {
  /**
   * Maximum width in pixels. Height is scaled proportionally.
   * Images smaller than this value are NOT upscaled — only the JPEG
   * quality pass is applied.
   * @default 1200
   */
  maxWidth?: number;
  /**
   * JPEG compression quality (0 – 1).
   * @default 0.75
   */
  quality?: number;
};

/**
 * Compresses a local image URI with expo-image-manipulator.
 *
 * - Resizes the image to at most `maxWidth` pixels wide (aspect ratio kept).
 * - Converts to JPEG at `quality`.
 * - Returns the new local URI pointing to the compressed file.
 *
 * @example
 * const compressed = await compressImage(localUri);
 * const avatar     = await compressImage(localUri, { maxWidth: 400, quality: 0.78 });
 */
export async function compressImage(
  uri: string,
  options: CompressOptions = {},
): Promise<string> {
  const { maxWidth = PHOTO_PRESET.maxWidth, quality = PHOTO_PRESET.quality } =
    options;

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxWidth } }],
    {
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );

  return result.uri;
}

/**
 * Compresses a profile avatar URI to a small square-safe JPEG.
 * Uses tighter defaults than `compressImage` since avatars are already
 * cropped 1 : 1 by the image picker.
 */
export async function compressAvatar(uri: string): Promise<string> {
  return compressImage(uri, {
    maxWidth: AVATAR_PRESET.maxWidth,
    quality: AVATAR_PRESET.quality,
  });
}

/**
 * Compresses an array of local photo URIs in sequence and returns the
 * array of compressed URIs, preserving order.
 */
export async function compressImages(
  uris: string[],
  options: CompressOptions = {},
): Promise<string[]> {
  const compressed: string[] = [];
  for (const uri of uris) {
    compressed.push(await compressImage(uri, options));
  }
  return compressed;
}


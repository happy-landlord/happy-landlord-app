import { supabase } from "@/lib/supabase/client";
import type { DbProfile, DbProfileUpdate } from "@/types/database";

/** Profile fields the user can edit themselves. */
export type ProfileEdits = Pick<DbProfileUpdate, "full_name" | "phone">;

export async function fetchProfile(userId: string): Promise<DbProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as DbProfile | null;
}

export async function updateProfile(
  userId: string,
  edits: ProfileEdits
): Promise<DbProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .update(edits as never)
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data as DbProfile;
}

// ── Profile image ─────────────────────────────────────────────────────────────

const PROFILE_BUCKET = "profiles";
const SIGNED_URL_TTL = 3600;

/**
 * Uploads a local photo URI to `profiles/{userId}/avatar.jpg` (overwrites
 * any existing avatar) and returns the storage path to save in the DB.
 */
export async function uploadProfileImage(
  userId: string,
  localUri: string,
): Promise<string> {
  const ext = localUri.split("?")[0].split(".").pop()?.toLowerCase() ?? "jpg";
  const contentType = ext === "png" ? "image/png" : "image/jpeg";
  const fileName = ext === "png" ? "avatar.png" : "avatar.jpg";
  const storagePath = `${userId}/${fileName}`;

  // React Native: `response.blob()` produces a 0-byte upload because RN's
  // Blob is just a metadata stub. `arrayBuffer()` returns the actual bytes
  // and is the supported way to upload files to Supabase Storage from RN.
  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage
    .from(PROFILE_BUCKET)
    .upload(storagePath, arrayBuffer, { contentType, upsert: true });

  if (error) throw new Error(`Failed to upload profile image: ${error.message}`);

  return `${PROFILE_BUCKET}/${storagePath}`;
}

/**
 * Patches the `profile_image` column for a user.
 * Pass `null` to clear the profile image.
 */
export async function updateProfileImagePath(
  userId: string,
  path: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ profile_image: path } as never)
    .eq("id", userId);

  if (error) throw error;
}

/**
 * Returns a short-lived signed URL for a profile image path.
 * Works with the private `profiles` storage bucket.
 */
export async function fetchSignedProfileImageUrl(
  path: string,
): Promise<string | null> {
  if (!path) return null;
  const strippedPath = path.replace(/^profiles\//, "");
  const { data, error } = await supabase.storage
    .from(PROFILE_BUCKET)
    .createSignedUrl(strippedPath, SIGNED_URL_TTL);
  if (error || !data?.signedUrl) {
    if (__DEV__) {
      console.warn(
        `[profile.service] createSignedUrl failed for "${strippedPath}":`,
        error?.message ?? "no URL returned",
      );
    }
    return null;
  }
  return data.signedUrl;
}

import { supabase } from "@/lib/supabase";
import { compressAvatar } from "@/lib/utils/imageCompression";
import { logger } from "@/lib/utils/logger";
import type { DbKeyHolder, DbProfile, DbProfileUpdate } from "@/types";

/** Profile fields the user can edit themselves. */
export type ProfileEdits = Pick<DbProfileUpdate, "full_name" | "phone" | "profile_image">;
export type AgentProfile = DbProfile & {
  key_holder_full_name: string | null;
  key_holder_phone: string | null;
};

/**
 * Returns the profile status for a given email, or null if no profile exists.
 * Used on the login screen to distinguish "email not confirmed" from
 * "account deactivated by admin" without requiring an authenticated session.
 *
 * Requires a public (anon-accessible) Supabase RPC:
 * ```sql
 * CREATE OR REPLACE FUNCTION get_account_status_by_email(p_email text)
 * RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
 *   SELECT status::text FROM profiles WHERE email = lower(trim(p_email)) LIMIT 1;
 * $$;
 * GRANT EXECUTE ON FUNCTION get_account_status_by_email(text) TO anon, authenticated;
 * ```
 */
export async function fetchAccountStatusByEmail(
  email: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc(
    "get_account_status_by_email" as never,
    { p_email: email.trim().toLowerCase() } as never,
  );
  if (error) return null;
  return (data as string | null) ?? null;
}

/**
 * Submits a reactivation request for a deactivated account without requiring
 * an active session. Sets the profile status back to 'pending' and creates
 * a new registration_request row for the admin to review.
 *
 * Requires a public RPC:
 * ```sql
 * CREATE OR REPLACE FUNCTION public.request_reactivation(p_email text)
 * RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
 * DECLARE v_profile_id uuid;
 * BEGIN
 *   SELECT id INTO v_profile_id FROM public.profiles
 *   WHERE email = lower(trim(p_email)) AND status = 'inactive' LIMIT 1;
 *   IF v_profile_id IS NULL THEN
 *     RAISE EXCEPTION 'No inactive account found for this email';
 *   END IF;
 *   INSERT INTO public.registration_requests (profile_id, status, message)
 *   VALUES (v_profile_id, 'pending', 'Reactivation request');
 *   UPDATE public.profiles SET status = 'pending' WHERE id = v_profile_id;
 * END; $$;
 * GRANT EXECUTE ON FUNCTION public.request_reactivation(text) TO anon, authenticated;
 * ```
 */
export async function requestReactivationByEmail(email: string): Promise<void> {
  const { error } = await supabase.rpc(
    "request_reactivation" as never,
    { p_email: email.trim().toLowerCase() } as never,
  );
  if (error) throw error;
}

/** Fetch all agent profiles (role = 'agent'), ordered by created_at descending. */
export async function fetchAgents(): Promise<AgentProfile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "agent")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) throw error;
  const profiles = (data ?? []) as DbProfile[];
  const missingProfileDetailsIds = profiles
    .filter((profile) => !profile.full_name?.trim() || !profile.phone?.trim())
    .map((profile) => profile.id);

  if (missingProfileDetailsIds.length === 0) {
    return profiles.map((profile) => ({
      ...profile,
      key_holder_full_name: null,
      key_holder_phone: null,
    }));
  }

  const { data: holders, error: holdersError } = await supabase
    .from("key_holders")
    .select("profile_id, full_name, phone, updated_at")
    .eq("holder_type", "agent")
    .in("profile_id", missingProfileDetailsIds)
    .order("updated_at", { ascending: false });

  if (holdersError) throw holdersError;

  const nameByProfileId = new Map<string, string>();
  const phoneByProfileId = new Map<string, string>();
  ((holders ?? []) as Pick<
    DbKeyHolder,
    "profile_id" | "full_name" | "phone"
  >[]).forEach((holder) => {
    const profileId = holder.profile_id;
    if (!profileId) return;

    const fullName = holder.full_name?.trim();
    const phone = holder.phone?.trim();

    if (fullName && !nameByProfileId.has(profileId)) {
      nameByProfileId.set(profileId, fullName);
    }
    if (phone && !phoneByProfileId.has(profileId)) {
      phoneByProfileId.set(profileId, phone);
    }
  });

  return profiles.map((profile) => ({
    ...profile,
    key_holder_full_name: nameByProfileId.get(profile.id) ?? null,
    key_holder_phone: phoneByProfileId.get(profile.id) ?? null,
  }));
}

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
  // Explicitly allow only the three editable fields — never forward
  // id, email, role, status, or created_at from the caller.
  const payload: ProfileEdits = {
    full_name: edits.full_name,
    phone: edits.phone,
    profile_image: edits.profile_image,
  };

  const { error } = await supabase
    .from("profiles")
    .update(payload as never)
    .eq("id", userId);

  if (error) throw error;

  // Re-fetch the row separately to avoid RLS-related `.single()` coercion errors.
  const { data, error: fetchError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!data) throw new Error("Profile not found after update.");
  return data as DbProfile;
}

/**
 * Mark an agent as inactive. The role is preserved so historical activity
 * remains attributable, but the profile is hidden from the agents list and
 * cannot be used for new check-outs.
 */
export async function deactivateAgent(profileId: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ status: "inactive" } as never)
    .eq("id", profileId);

  if (error) throw error;
}

// ── Profile image ─────────────────────────────────────────────────────────────

const PROFILE_BUCKET = "profiles";
const SIGNED_URL_TTL = 3600;

/**
 * Uploads a local photo URI to `profiles/{userId}/avatar.jpg` (overwrites
 * any existing avatar) and returns the storage path to save in the DB.
 *
 * The image is compressed to ≤ 400 px wide JPEG before upload to keep
 * avatar storage minimal (~30–60 KB each).
 */
export async function uploadProfileImage(
  userId: string,
  localUri: string,
): Promise<string> {
  // Compress to a small avatar-sized JPEG before uploading
  const compressedUri = await compressAvatar(localUri);

  const storagePath = `${userId}/avatar.jpg`;
  const contentType = "image/jpeg";

  // React Native: `response.blob()` produces a 0-byte upload because RN's
  // Blob is just a metadata stub. `arrayBuffer()` returns the actual bytes
  // and is the supported way to upload files to Supabase Storage from RN.
  const response = await fetch(compressedUri);
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
    logger.warn(
      `[profile.service] createSignedUrl failed for "${strippedPath}"`,
      { message: error?.message ?? "no URL returned" },
    );
    return null;
  }
  return data.signedUrl;
}

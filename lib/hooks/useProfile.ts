import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/lib/query";
import {
  deactivateAgent,
  fetchAgents,
  fetchCheckedOutKeySets,
  fetchProfile,
  fetchSignedProfileImageUrl,
  updateProfile,
  updateProfileImagePath,
  uploadProfileImage,
  type ProfileEdits,
} from "@/lib/services";
import { useSession } from "@/lib/hooks/useSession";

/** Returns all agent profiles for the admin view. */
export function useAgents() {
  return useQuery({
    queryKey: QUERY_KEYS.agents.all,
    queryFn: fetchAgents,
    staleTime: 1000 * 60, // 1 min — agents list rarely changes mid-session
  });
}

export function useProfile() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: userId
      ? QUERY_KEYS.auth.profile(userId)
      : ["auth", "profile", "none"],
    queryFn: () => fetchProfile(userId!),
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateProfile() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: (edits: ProfileEdits) => updateProfile(userId!, edits),
    onSuccess: (updated) => {
      if (userId) {
        queryClient.setQueryData(QUERY_KEYS.auth.profile(userId), updated);
      }
    },
  });
}

/** Returns a signed URL for the given profile image path, cached for 55 min. */
export function useProfileImageUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.storage.signedUrl(path ?? ""),
    queryFn: () => fetchSignedProfileImageUrl(path!),
    enabled: Boolean(path),
    staleTime: 1000 * 60 * 55,
    gcTime: 1000 * 60 * 65,
  });
}

/**
 * Uploads a local photo URI as the current user's avatar:
 *  1. Pushes the file to Supabase Storage.
 *  2. Patches `profiles.profile_image` with the new path.
 *  3. Optimistically updates the cached profile so `useProfileImageUrl`
 *     fires the signed-URL fetch in the same render cycle.
 *  4. Invalidates the cached signed URL (handles re-uploads of the same path).
 */
export function useUploadProfileImage() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: async (localUri: string) => {
      if (!userId) throw new Error("No active session");
      const path = await uploadProfileImage(userId, localUri);
      await updateProfileImagePath(userId, path);
      return path;
    },
    onSuccess: (path) => {
      if (!userId) return;
      const key = QUERY_KEYS.auth.profile(userId);
      const existing = queryClient.getQueryData<{ profile_image?: string | null }>(key);
      if (existing) {
        queryClient.setQueryData(key, { ...existing, profile_image: path });
      }
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.storage.signedUrl(path),
      });
    },
  });
}

/**
 * Returns the keysets currently held (checked out or overdue) by a specific
 * agent. Used by the admin agent details sheet.
 */
export function useAgentHeldKeySets(profileId: string | null | undefined) {
  return useQuery({
    queryKey: [...QUERY_KEYS.agents.all, "held", profileId ?? ""] as const,
    queryFn: () =>
      fetchCheckedOutKeySets({ holderProfileId: profileId!, limit: 100 }),
    enabled: Boolean(profileId),
    staleTime: 1000 * 30,
  });
}

/** Mark an agent as inactive (admin only). */
export function useDeactivateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profileId: string) => deactivateAgent(profileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.agents.all });
    },
  });
}


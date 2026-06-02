import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/lib/query/keys";
import {
  fetchProfile,
  fetchSignedProfileImageUrl,
  updateProfile,
  type ProfileEdits,
} from "@/lib/services/profile.service";
import { useSession } from "@/lib/hooks/useSession";

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

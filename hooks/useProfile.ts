import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/constants/queryKeys";
import { fetchProfile, updateProfile, type ProfileEdits } from "@/services/profile.service";
import { useSession } from "@/hooks/useSession";

export function useProfile() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: QUERY_KEYS.auth.profile,
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
      queryClient.setQueryData(QUERY_KEYS.auth.profile, updated);
    },
  });
}

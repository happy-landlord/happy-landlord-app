import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/constants/queryKeys";
import { useSession } from "@/hooks/useSession";
import { useRole } from "@/hooks/useRole";
import {
  fetchMyActivity,
  fetchAllActivity,
} from "@/services/movements.service";
import type { ActivityMovement } from "@/types/database";

export type { ActivityMovement };

export function useMyActivity() {
  const { session } = useSession();
  const { isAdmin, isLoading: roleLoading } = useRole();
  const userId = session?.user.id;

  return useQuery({
    queryKey: isAdmin
      ? QUERY_KEYS.activity.all
      : userId
        ? QUERY_KEYS.activity.mine(userId)
        : ["activity", "none"],
    queryFn: isAdmin
      ? fetchAllActivity
      : () => fetchMyActivity(userId!),
    enabled: !roleLoading && Boolean(userId),
    staleTime: 1000 * 30,
  });
}

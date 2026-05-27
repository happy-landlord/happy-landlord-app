import { useProfile } from "@/hooks/useProfile";
import { useCurrentUserId } from "@/hooks/useSession";
import type { UserRole } from "@/constants/roles";

export type UseRoleResult = {
  role: UserRole | undefined;
  isAdmin: boolean;
  isAgent: boolean;
  /** True while the profile is still being fetched — avoid rendering role-gated UI until false */
  isLoading: boolean;
};

export function useRole(): UseRoleResult {
  const { data: profile, isLoading } = useProfile();

  const role = profile?.role;

  return {
    role,
    isAdmin: role === "admin",
    isAgent: role === "agent",
    isLoading,
  };
}

// ── Query scope helper ───────────────────────────────────────────────────────

export type QueryScope = {
  /** Current user id, or undefined when not signed in. */
  userId: string | undefined;
  isAdmin: boolean;
  /**
   * String key for cache partitioning:
   *   - `"admin"` when the user is an admin (sees all data)
   *   - `userId` for regular users (sees only their own)
   *   - `"none"` while not signed in
   */
  scope: string;
  /** True while session or role is still resolving. */
  isLoading: boolean;
  /** Convenience: `true` once role is known AND we have a user id. */
  ready: boolean;
};

/**
 * Shared helper for queries that key their cache by role + user.
 * Eliminates the `useSession + useRole + userId + scope` boilerplate
 * repeated across activity/keys hooks.
 */
export function useQueryScope(): QueryScope {
  const userId = useCurrentUserId();
  const { isAdmin, isLoading } = useRole();
  const scope = isAdmin ? "admin" : userId ?? "none";

  return {
    userId,
    isAdmin,
    scope,
    isLoading,
    ready: !isLoading && Boolean(userId),
  };
}

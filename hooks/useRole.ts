import { useCurrentUserId, useProfile } from "@/lib/hooks";
import { useDevOverridesStore } from "@/lib/state";
import type { UserRole } from "@/types";

export type UseRoleResult = {
  role: UserRole | undefined;
  isAdmin: boolean;
  isAgent: boolean;
  /** True while the profile is still being fetched — avoid rendering role-gated UI until false */
  isLoading: boolean;
};

export function useRole(): UseRoleResult {
  const { data: profile, isLoading } = useProfile();
  // Dev-only admin override — completely tree-shaken in production builds
  // because `__DEV__` is a Metro compile-time constant.
  const adminOverride = useDevOverridesStore((s) => s.adminOverride);

  const role = profile?.role;
  const isAdmin = role === "admin" || (__DEV__ && adminOverride);

  return {
    role,
    isAdmin,
    isAgent: role === "agent" && !isAdmin,
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
  const scope = isAdmin ? "admin" : (userId ?? "none");

  return {
    userId,
    isAdmin,
    scope,
    isLoading,
    ready: !isLoading && Boolean(userId),
  };
}

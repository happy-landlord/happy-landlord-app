import { useProfile } from "@/hooks/useProfile";
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


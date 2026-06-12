import type { ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";

import { useRole } from "@/hooks";
import type { UserRole } from "@/types";
import { theme } from "@/constants";

type RoleGateProps = {
  /** Render children only when the user has one of these roles */
  allow: UserRole | UserRole[];
  children: ReactNode;
  /**
   * What to render when the role doesn't match.
   * Defaults to null (render nothing).
   */
  fallback?: ReactNode;
};

/**
 * Conditionally renders children based on the logged-in user's role.
 *
 * - While the profile is loading a small spinner is shown so there's no
 *   incorrect UI flash (e.g. admin briefly seeing an agent-only view).
 * - If the role doesn't match, `fallback` is rendered (default: nothing).
 *
 * @example
 * <RoleGate allow="admin">
 *   <AdminOnlyPanel />
 * </RoleGate>
 *
 * @example
 * <RoleGate allow={["admin", "agent"]} fallback={<Text>No access</Text>}>
 *   <SharedPanel />
 * </RoleGate>
 */
export function RoleGate({ allow, children, fallback = null }: RoleGateProps) {
  const { role, isAdmin, isLoading } = useRole();

  if (isLoading) {
    return (
      <View style={{ padding: theme.spacing.md }}>
        <ActivityIndicator size="small" color={theme.colors.accent} />
      </View>
    );
  }

  const allowed = Array.isArray(allow) ? allow : [allow];

  // `isAdmin` already incorporates the dev override, so treat it as the source
  // of truth for admin access rather than checking the raw DB role string.
  const hasAccess =
    (allowed.includes("admin") && isAdmin) ||
    (role !== undefined && allowed.includes(role));

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

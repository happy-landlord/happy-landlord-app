import type { UserRole } from "@/types";
import { theme } from "./theme";

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  agent: "Agent",
};

export const ROLE_COLOR: Record<UserRole, string> = {
  admin: theme.colors.primary, // bronze
  agent: theme.colors.info,
};

export const ROLE_BG: Record<UserRole, string> = {
  admin: theme.colors.primarySoft,
  agent: theme.colors.infoSoft,
};

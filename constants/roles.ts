import type { DbProfile } from "@/types/database";

// Derived directly from the DB schema — no duplication
export type UserRole = DbProfile["role"];

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  agent: "Agent",
};

export const ROLE_COLOR: Record<UserRole, string> = {
  admin: "#A38449", // primary/bronze
  agent: "#3E6F8F", // info
};

export const ROLE_BG: Record<UserRole, string> = {
  admin: "#F2E9D7", // primarySoft
  agent: "#E8F1F6", // infoSoft
};

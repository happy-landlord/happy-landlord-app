/**
 * Barrel re-exports for the top-level app `@/hooks`.
 *
 * Only **cross-cutting** hooks live here — ones used by many unrelated
 * features (auth/role, query helpers, generic utilities). Feature-specific
 * hooks live alongside their feature in `@/components/<feature>/`.
 *
 * Import via:
 *   import { useRole, useDebouncedValue } from "@/hooks";
 */
export * from "./useDebouncedValue";
export * from "./useRefreshControl";
export * from "./useRole";

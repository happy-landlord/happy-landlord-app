/**
 * Barrel re-exports for the top-level app `@/hooks`.
 *
 * These are app-level hooks that compose multiple `lib/hooks` together
 * (e.g. role gating, keyset action consolidation).
 *
 * Import via:
 *   import { useRole, useKeySetActions, useQueryScope } from "@/hooks";
 */
export * from "./useRole";
export * from "./useKeySetActions";


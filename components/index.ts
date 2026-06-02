/**
 * Barrel re-exports for top-level `@/components`.
 *
 * Only includes the flat top-level component files. Subdirectories
 * (`key`, `property`, `ui`) keep their own barrels and are
 * imported directly to avoid accidental wide-blast-radius imports.
 *
 * Import via:
 *   import { AppHeader, RoleGate, PropertyCard } from "@/components";
 */
export * from "./AppHeader";
export * from "./BiometricEnablePrompt";
export * from "./BottomNav";
export * from "./KeyDashboardSummary";
export * from "./KeySetAttentionList";
export * from "./KeyStatusChip";
export * from "./LockScreen";
export * from "./MenuSheet";
export * from "./NotificationBell";
export * from "./PropertyCard";
export * from "./RoleGate";

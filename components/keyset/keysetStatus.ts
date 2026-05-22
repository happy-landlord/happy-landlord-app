import type { KeySetStatus as DbKeySetStatus } from "@/services/keys.service";

/**
 * UI-facing keyset status. Decouples action buttons from raw DB statuses
 * by incorporating "who holds it" into the view-model.
 */
export type KeysetViewStatus =
  | "available"
  | "checked_out_by_me"
  | "checked_out_by_other"
  | "overdue"
  | "missing"
  | "damaged";

/**
 * Maps the raw key_sets.status column + holder context onto a view-model
 * status that drives action-button availability.
 */
export function resolveKeysetStatus(
  dbStatus: DbKeySetStatus,
  isHeldByMe: boolean,
): KeysetViewStatus {
  switch (dbStatus) {
    case "available":
    case "reserved":
      // Reserved is treated as available so the holder can still check it out;
      // a future iteration may display a "reserved" banner here.
      return "available";
    case "borrowed":
      return isHeldByMe ? "checked_out_by_me" : "checked_out_by_other";
    case "overdue":
      // Overdue is the most urgent state; returning is always the primary action.
      return "overdue";
    case "lost":
      return "missing";
    case "tenant":
      // Tenant-held — agents can request access but not check out.
      return "checked_out_by_other";
    case "inactive":
    default:
      return "available";
  }
}


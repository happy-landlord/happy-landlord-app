import type { KeySetStatus } from "@/types/database";

/**
 * UI-facing keyset status. Decouples action buttons from raw DB statuses
 * by incorporating "who holds it" into the view-model.
 */
export type KeysetViewStatus =
  | "available"
  | "checked_out_by_me"
  | "checked_out_by_other"
  | "overdue_by_me"
  | "overdue_by_other"
  | "handover_tenant"
  | "handover_landlord"
  | "missing_damaged"
  | "inactive";

/**
 * Maps the raw key_sets.status column + holder context onto a view-model
 * status that drives action-button availability.
 */
export function resolveKeysetStatus(
  dbStatus: KeySetStatus,
  isHeldByMe: boolean,
): KeysetViewStatus {
  switch (dbStatus) {
    case "available":
      return "available";
    case "checked_out":
      return isHeldByMe ? "checked_out_by_me" : "checked_out_by_other";
    case "overdue":
      return isHeldByMe ? "overdue_by_me" : "overdue_by_other";
    case "handover_tenant":
      return "handover_tenant";
    case "handover_landlord":
      return "handover_landlord";
    case "missing_damaged":
      return "missing_damaged";
    case "inactive":
    default:
      return "inactive";
  }
}

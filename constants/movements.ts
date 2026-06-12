/**
 * Canonical transaction display config shared across all activity/dashboard screens.
 * Provides a label, icon, foreground colour, and background colour for every
 * key-transaction type.
 */
import {
  FileText,
  Flag,
  Home,
  LockKeyhole,
  Plus,
  Share,
  Undo2,
  User,
} from "lucide-react-native";
import { theme } from "@/constants/theme";
import type { KeyTransactionType, ActivityTransaction } from "@/types";
export type MovementConfig = {
  label: string;
  /** Label shown when the viewing user is the one who performed the action. */
  youLabel?: string;
  Icon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
  color: string;
  bg: string;
};
export const MOVEMENT_CONFIG: Record<KeyTransactionType, MovementConfig> = {
  created: {
    label: "Added",
    Icon: Plus,
    color: theme.colors.success,
    bg: theme.colors.successSoft,
  },
  checked_out: {
    label: "Checked Out",
    youLabel: "You checked out",
    Icon: Share,
    color: theme.colors.neutral,
    bg: theme.colors.neutralSoft,
  },
  returned: {
    label: "Returned",
    Icon: Undo2,
    color: theme.colors.success,
    bg: theme.colors.successSoft,
  },
  marked_overdue: {
    label: "Overdue",
    youLabel: "You marked overdue",
    Icon: Flag,
    color: theme.colors.danger,
    bg: theme.colors.dangerSoft,
  },
  marked_missing_damaged: {
    label: "Reported Lost",
    Icon: LockKeyhole,
    color: theme.colors.danger,
    bg: theme.colors.dangerSoft,
  },
  handover_tenant: {
    label: "Handed to Tenant",
    Icon: User,
    color: theme.colors.keyTenant,
    bg: theme.colors.keyTenantSoft,
  },
  handover_landlord: {
    label: "Handed to Landlord",
    Icon: Home,
    color: theme.colors.primaryDark,
    bg: theme.colors.primarySoft,
  },
  notes_updated: {
    label: "Notes Updated",
    youLabel: "You updated notes",
    Icon: FileText,
    color: theme.colors.neutral,
    bg: theme.colors.neutralSoft,
  },
};
/**
 * Returns the display label for a transaction.
 *
 * - When the viewing user is the one who performed the action (`updated_by`),
 *   the label is prefixed with "You" (e.g. "You borrowed", "You returned").
 * - Transfers get direction-aware text ("You transferred to X" / "You received from X").
 *
 * @param item          - The activity transaction row (with joined from/to_holder).
 * @param currentUserId - The auth user id of the person viewing the activity.
 */
export function getMovementLabel(
  item: ActivityTransaction,
  currentUserId?: string | null,
): string {
  const cfg = MOVEMENT_CONFIG[item.transaction_type];

  // "returned" — actor is always the from_holder (who physically had the key).
  // Do NOT use updated_by here: an admin may record the return on behalf of an agent.
  if (item.transaction_type === "returned") {
    const isMeHolder = Boolean(
      currentUserId && item.from_holder?.profile_id === currentUserId,
    );
    if (isMeHolder) return "You returned";
    const name = item.from_holder?.full_name;
    return name ? `${name} returned` : cfg.label;
  }

  // "checked_out" — actor is the to_holder (who took the key).
  if (item.transaction_type === "checked_out") {
    const isMeHolder = Boolean(
      currentUserId && item.to_holder?.profile_id === currentUserId,
    );
    if (isMeHolder) return cfg.youLabel ?? "You checked out";
    const name = item.to_holder?.full_name;
    return name ? `${name} ${cfg.label.toLowerCase()}` : cfg.label;
  }

  // All other types: check if the current user was the one who performed it
  const isMe = Boolean(currentUserId && item.updated_by === currentUserId);
  if (isMe) {
    return cfg.youLabel ?? `You ${cfg.label.toLowerCase()}`;
  }

  // Find the actor name by matching updated_by to a holder's profile_id
  const actorName =
    [item.from_holder, item.to_holder].find(
      (h) => h?.profile_id === item.updated_by,
    )?.full_name ??
    item.from_holder?.full_name ??
    item.to_holder?.full_name ??
    null;

  return actorName ? `${actorName} ${cfg.label.toLowerCase()}` : cfg.label;
}

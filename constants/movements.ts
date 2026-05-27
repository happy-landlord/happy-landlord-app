/**
 * Canonical transaction display config shared across all activity/dashboard screens.
 * Provides a label, icon, foreground colour, and background colour for every
 * key-transaction type.
 */
import {
  AlertTriangle,
  ArrowLeftRight,
  Clock,
  FileText,
  Home,
  LogIn,
  LogOut,
  Plus,
  User,
  XCircle,
} from "lucide-react-native";
import { theme } from "@/constants/theme";
import type { KeyTransactionType, ActivityTransaction } from "@/types/database";
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
  borrowed: {
    label: "Borrowed",
    Icon: LogOut,
    color: theme.colors.warning,
    bg: theme.colors.warningSoft,
  },
  returned: {
    label: "Returned",
    Icon: LogIn,
    color: theme.colors.success,
    bg: theme.colors.successSoft,
  },
  reserved: {
    label: "Reserved",
    Icon: Clock,
    color: theme.colors.info,
    bg: theme.colors.infoSoft,
  },
  reservation_cancelled: {
    label: "Reservation Cancelled",
    youLabel: "You cancelled reservation",
    Icon: XCircle,
    color: theme.colors.neutral,
    bg: theme.colors.neutralSoft,
  },
  transferred: {
    label: "Transferred",
    Icon: ArrowLeftRight,
    color: theme.colors.primary,
    bg: theme.colors.primarySoft ?? theme.colors.neutralSoft,
  },
  marked_overdue: {
    label: "Overdue",
    youLabel: "You marked overdue",
    Icon: AlertTriangle,
    color: theme.colors.danger,
    bg: theme.colors.dangerSoft,
  },
  marked_lost: {
    label: "Marked Lost",
    Icon: XCircle,
    color: theme.colors.danger,
    bg: theme.colors.dangerSoft,
  },
  handed_to_tenant: {
    label: "Handed to Tenant",
    Icon: User,
    color: theme.colors.info,
    bg: theme.colors.infoSoft,
  },
  handed_to_landlord: {
    label: "Handed to Landlord",
    Icon: Home,
    color: theme.colors.primary,
    bg: theme.colors.primarySoft ?? theme.colors.neutralSoft,
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
  const isMe = Boolean(currentUserId && item.updated_by === currentUserId);
  const cfg = MOVEMENT_CONFIG[item.transaction_type];
  if (item.transaction_type === "transferred") {
    const fromIsMe = item.from_holder?.profile_id === currentUserId;
    if (fromIsMe && item.to_holder?.full_name) {
      return `You transferred to ${item.to_holder.full_name}`;
    }
    if (!fromIsMe && item.from_holder?.full_name) {
      return isMe
        ? `You received from ${item.from_holder.full_name}`
        : `Transferred from ${item.from_holder.full_name}`;
    }
    return isMe ? "You transferred" : cfg.label;
  }
  if (isMe) {
    return cfg.youLabel ?? `You ${cfg.label.toLowerCase()}`;
  }

  // Find the name of whoever actually performed the action (matched by updated_by)
  const actorName =
    [item.to_holder, item.from_holder]
      .find((h) => h?.profile_id === item.updated_by)
      ?.full_name ??
    item.to_holder?.full_name ??
    item.from_holder?.full_name ??
    null;

  if (actorName) {
    return `${actorName} ${cfg.label.toLowerCase()}`;
  }

  return cfg.label;
}

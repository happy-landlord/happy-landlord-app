/**
 * Canonical movement display config shared across all activity/dashboard screens.
 * Provides a label, icon, foreground colour, and background colour for every
 * key-movement type.
 */

import {
  AlertTriangle,
  ArrowLeftRight,
  Clock,
  FileText,
  LogIn,
  LogOut,
  Plus,
  XCircle,
} from "lucide-react-native";

import { theme } from "@/constants/theme";
import type { KeyMovementType, ActivityMovement } from "@/types/database";

export type MovementConfig = {
  label: string;
  Icon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
  color: string;
  bg: string;
};

export const MOVEMENT_CONFIG: Record<KeyMovementType, MovementConfig> = {
  created: {
    label: "Added",
    Icon: Plus,
    color: theme.colors.success,
    bg: theme.colors.successSoft,
  },
  borrowed: {
    label: "Collected",
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
  transferred: {
    label: "Transferred",
    Icon: ArrowLeftRight,
    color: theme.colors.primary,
    bg: theme.colors.primarySoft ?? theme.colors.neutralSoft,
  },
  marked_overdue: {
    label: "Overdue",
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
  notes_updated: {
    label: "Notes Updated",
    Icon: FileText,
    color: theme.colors.neutral,
    bg: theme.colors.neutralSoft,
  },
};

/**
 * Returns the display label for a movement, with direction-aware text for
 * transfers ("Transferred from [name]" / "Transferred to [name]").
 *
 * @param item         - The activity movement row (with joined from/to_holder).
 * @param currentUserId - The auth user id of the person viewing the activity.
 */
export function getMovementLabel(
  item: ActivityMovement,
  currentUserId?: string | null,
): string {
  if (item.movement_type !== "transferred") {
    return MOVEMENT_CONFIG[item.movement_type].label;
  }

  const fromIsMe = item.from_holder?.profile_id === currentUserId;

  if (fromIsMe && item.to_holder?.full_name) {
    return `Transferred to ${item.to_holder.full_name}`;
  }
  if (!fromIsMe && item.from_holder?.full_name) {
    return `Transferred from ${item.from_holder.full_name}`;
  }

  return MOVEMENT_CONFIG.transferred.label;
}

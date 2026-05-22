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
import type { KeyMovementType } from "@/types/database";

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


import {
  AlertTriangle,
  Bell,
  Building2,
  CalendarClock,
  Clock,
  RotateCcw,
  UserPlus,
} from "lucide-react-native";

import { theme } from "@/constants";
import { NOTIFICATION_TYPES, type NotificationType } from "@/lib/services";

// ── Notification visuals ─────────────────────────────────────────────────────
// Domain-level metadata for each notification type. Lives here (not in the
// service layer) because it pulls in icon components. The `Record<NotificationType, …>`
// type guarantees TS exhaustiveness — adding a new `NotificationType` is a
// compile error until its visual is defined, so no `isKnownNotificationType`
// runtime guard is needed.

export type NotificationVisual = {
  label: string;
  Icon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
  color: string;
  bg: string;
};

export const NOTIFICATION_VISUALS: Record<NotificationType, NotificationVisual> =
  {
    KEY_DUE_SOON: {
      label: "Due soon",
      Icon: Clock,
      color: theme.colors.warning,
      bg: theme.colors.warningSoft,
    },
    KEY_OVERDUE: {
      label: "Overdue",
      Icon: AlertTriangle,
      color: theme.colors.danger,
      bg: theme.colors.dangerSoft,
    },
    KEY_LOST_REPORTED: {
      label: "Lost keyset",
      Icon: AlertTriangle,
      color: theme.colors.danger,
      bg: theme.colors.dangerSoft,
    },
    USER_REGISTRATION_REQUESTED: {
      label: "Registration",
      Icon: UserPlus,
      color: theme.colors.primary,
      bg: theme.colors.primarySoft,
    },
    KEY_RECALL_REQUESTED: {
      label: "Recall requested",
      Icon: RotateCcw,
      color: theme.colors.warning,
      bg: theme.colors.warningSoft,
    },
    // ── Agent ───────────────────────────────────────────────────────────────
    UPCOMING_RESERVATION: {
      label: "Upcoming reservation",
      Icon: CalendarClock,
      color: theme.colors.info,
      bg: theme.colors.infoSoft,
    },
    // ── Admin ───────────────────────────────────────────────────────────────
    TENANCY_REMINDER: {
      label: "Tenancy reminder",
      Icon: Building2,
      color: theme.colors.primary,
      bg: theme.colors.primarySoft,
    },
  };

const FALLBACK_VISUAL: NotificationVisual = {
  label: "Notification",
  Icon: Bell,
  color: theme.colors.neutral,
  bg: theme.colors.neutralSoft,
};

/**
 * Returns the visual for a notification type, defaulting to a neutral Bell
 * visual when the type is unrecognized (e.g. a new server-side type that the
 * app hasn't shipped support for yet).
 */
export function getNotificationVisual(type: string): NotificationVisual {
  return (
    NOTIFICATION_VISUALS[type as NotificationType] ?? FALLBACK_VISUAL
  );
}

/** Stable ordered list of types — used by the admin test panel chip grid. */
export const NOTIFICATION_TYPE_LIST = Object.values(
  NOTIFICATION_TYPES,
) as NotificationType[];


import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

import { supabase } from "@/lib/supabase/client";
import type { DbNotification } from "@/types/database";

// ── App-domain notification types ───────────────────────────────────────────
// These live here (not in database.ts) because they describe app conventions
// for the notification payload, not the underlying DB schema.

/** Discriminator for the `notifications.type` column. */
export type NotificationType =
  | "KEY_CHECKOUT_CREATED"
  | "KEY_DUE_SOON"
  | "KEY_OVERDUE"
  | "KEY_RETURNED"
  | "KEY_LOST_REPORTED"
  | "USER_REGISTRATION_REQUESTED"
  | "KEY_RECALL_REQUESTED";

/**
 * Payload attached to a push notification's `data` field. Accepts both
 * snake_case and camelCase variants to be forgiving with upstream senders.
 */
export type NotificationNavigationData = {
  route?: string;
  path?: string;
  related_property_id?: string;
  relatedPropertyId?: string;
  property_id?: string;
  propertyId?: string;
  related_key_set_id?: string;
  relatedKeySetId?: string;
  key_set_id?: string;
  keySetId?: string;
  related_checkout_id?: string;
  relatedCheckoutId?: string;
  checkout_id?: string;
  checkoutId?: string;
  transaction_id?: string;
  transactionId?: string;
  key_id?: string;
  keyId?: string;
  [key: string]: unknown;
};

export const NOTIFICATION_TYPES = {
  KEY_CHECKOUT_CREATED: "KEY_CHECKOUT_CREATED",
  KEY_DUE_SOON: "KEY_DUE_SOON",
  KEY_OVERDUE: "KEY_OVERDUE",
  KEY_RETURNED: "KEY_RETURNED",
  KEY_LOST_REPORTED: "KEY_LOST_REPORTED",
  USER_REGISTRATION_REQUESTED: "USER_REGISTRATION_REQUESTED",
  KEY_RECALL_REQUESTED: "KEY_RECALL_REQUESTED",
} as const satisfies Record<NotificationType, NotificationType>;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function getProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId
  );
}

export async function requestExpoPushToken(): Promise<string | null> {
  if (Platform.OS === "web" || !Device.isDevice) {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#A38449",
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let finalStatus = existing.status;

  if (existing.status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const projectId = getProjectId();
  const token = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );

  return token.data;
}

export async function saveUserPushToken(
  userId: string,
  expoPushToken: string
): Promise<void> {
  const { error } = await supabase
    .from("user_push_tokens")
    .upsert(
      {
        user_id: userId,
        expo_push_token: expoPushToken,
        platform: Platform.OS,
        device_name: Device.deviceName ?? null,
        is_active: true,
      } as never,
      { onConflict: "user_id,expo_push_token" }
    );

  if (error) throw error;
}

export async function fetchNotifications(
  userId: string
): Promise<DbNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DbNotification[];
}

export async function fetchUnreadNotificationCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_user_id", userId)
    .is("read_at", null);

  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const { error } = await supabase.rpc("mark_notification_read", {
    notification_id: notificationId,
  });

  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() } as never)
    .eq("recipient_user_id", userId)
    .is("read_at", null);

  if (error) throw error;
}

export type PushStatus = {
  /** OS-level permission status */
  permissionStatus: Notifications.PermissionStatus;
  /** True when the user has at least one active token registered in the DB */
  hasActiveToken: boolean;
  /** Derived: push is fully on when permission granted AND an active token exists */
  pushEnabled: boolean;
};

export async function fetchPushStatus(userId: string): Promise<PushStatus> {
  const [{ status }, { count }] = await Promise.all([
    Notifications.getPermissionsAsync(),
    supabase
      .from("user_push_tokens")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_active", true),
  ]);

  const hasActiveToken = (count ?? 0) > 0;
  return {
    permissionStatus: status,
    hasActiveToken,
    pushEnabled: status === "granted" && hasActiveToken,
  };
}

export async function deactivateAllPushTokens(userId: string): Promise<void> {
  const { error } = await supabase
    .from("user_push_tokens")
    .update({ is_active: false } as never)
    .eq("user_id", userId);

  if (error) throw error;
}

/**
 * Calls the `send-push-notification` Supabase Edge Function.
 * The Edge Function is responsible for building the privacy-safe push payload
 * (no full property addresses on the lock screen) and dispatching via Expo Push API.
 */
export async function sendPushNotification(notificationId: string): Promise<void> {
  const { error } = await supabase.functions.invoke("send-push-notification", {
    body: { notification_id: notificationId },
  });

  if (error) throw error;
}

/**
 * Creates a notification row via the `create_notification` RPC and returns
 * the new notification id.  Used by the admin test helper.
 */
export async function createNotification(params: {
  recipientUserId: string;
  title: string;
  body: string;
  type: string;
  relatedPropertyId?: string | null;
  relatedKeySetId?: string | null;
  relatedCheckoutId?: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc("create_notification", {
    p_recipient_user_id: params.recipientUserId,
    p_title: params.title,
    p_body: params.body,
    p_type: params.type,
    p_related_property_id: params.relatedPropertyId ?? null,
    p_related_key_set_id: params.relatedKeySetId ?? null,
    p_related_checkout_id: params.relatedCheckoutId ?? null,
  });

  if (error) throw error;
  if (!data) throw new Error("create_notification RPC returned no id");
  return data as string;
}

export function getNotificationTargetPath(
  data: NotificationNavigationData | null | undefined
): string | null {
  if (!data) return null;

  const directPath = typeof data.path === "string" ? data.path : data.route;
  if (typeof directPath === "string" && directPath.length > 0) {
    return directPath;
  }

  if (data.type === NOTIFICATION_TYPES.USER_REGISTRATION_REQUESTED) {
    return "/(app)/requests";
  }

  const propertyId = data.related_property_id ?? data.relatedPropertyId ?? data.property_id ?? data.propertyId;
  if (typeof propertyId === "string" && propertyId.length > 0) {
    return `/(app)/properties/${propertyId}`;
  }

  const keyId = data.related_key_set_id ?? data.relatedKeySetId ?? data.key_set_id ?? data.keySetId;
  if (typeof keyId === "string" && keyId.length > 0) {
    return `/(app)/keys/${keyId}`;
  }

  const checkoutId = data.related_checkout_id ?? data.relatedCheckoutId ?? data.checkout_id ?? data.checkoutId;
  if (typeof checkoutId === "string" && checkoutId.length > 0) {
    return `/(app)/checkouts/${checkoutId}`;
  }

  return null;
}

export function getNotificationRowTargetPath(
  notification: Pick<
    DbNotification,
    "type" | "related_property_id" | "related_key_set_id" | "related_checkout_id"
  >
): string | null {
  if (notification.type === NOTIFICATION_TYPES.USER_REGISTRATION_REQUESTED) {
    return "/(app)/requests";
  }

  if (notification.related_key_set_id) {
    return `/(app)/keys/${notification.related_key_set_id}`;
  }

  if (notification.related_property_id) {
    return `/(app)/properties/${notification.related_property_id}`;
  }

  if (notification.related_checkout_id) {
    return `/(app)/checkouts/${notification.related_checkout_id}`;
  }

  return null;
}


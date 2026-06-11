import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

import { supabase } from "@/lib/supabase";
import type { DbNotification } from "@/types";

// ── App-domain notification types ───────────────────────────────────────────
// These live here (not in database.ts) because they describe app conventions
// for the notification payload, not the underlying DB schema.

/** Discriminator for the `notifications.type` column. */
export type NotificationType =
  | "KEY_DUE_SOON"
  | "KEY_OVERDUE"
  | "KEY_LOST_REPORTED"
  | "USER_REGISTRATION_REQUESTED"
  | "KEY_RECALL_REQUESTED"
  // ── Agent notifications ───────────────────────────────────────────────────
  /** Sent to the agent 24 hours before their reservation window starts. */
  | "UPCOMING_RESERVATION"
  // ── Admin notifications ───────────────────────────────────────────────────
  /** Sent to admins as a tenancy-related reminder (e.g. lease expiry). */
  | "TENANCY_REMINDER";

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
  KEY_DUE_SOON: "KEY_DUE_SOON",
  KEY_OVERDUE: "KEY_OVERDUE",
  KEY_LOST_REPORTED: "KEY_LOST_REPORTED",
  USER_REGISTRATION_REQUESTED: "USER_REGISTRATION_REQUESTED",
  KEY_RECALL_REQUESTED: "KEY_RECALL_REQUESTED",
  // ── Agent ─────────────────────────────────────────────────────────────────
  UPCOMING_RESERVATION: "UPCOMING_RESERVATION",
  // ── Admin ─────────────────────────────────────────────────────────────────
  TENANCY_REMINDER: "TENANCY_REMINDER",
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

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#A38449",
  });
}

async function getExpoPushTokenSafe(): Promise<string | null> {
  const projectId = getProjectId();
  const token = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  return token.data;
}

/**
 * Returns an Expo push token **only if permission has already been granted**.
 * Never prompts the user. Use this for app-launch silent re-registration so
 * we don't pop the OS permission dialog before the user has any context.
 */
export async function getExistingExpoPushToken(): Promise<string | null> {
  if (Platform.OS === "web" || !Device.isDevice) return null;
  await ensureAndroidChannel();
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return null;
  return getExpoPushTokenSafe();
}

/**
 * Prompts the OS for push permission if necessary, then returns a token.
 * Call this only from explicit user-driven actions (e.g. the Settings toggle).
 */
export async function requestExpoPushToken(): Promise<string | null> {
  if (Platform.OS === "web" || !Device.isDevice) return null;
  await ensureAndroidChannel();

  const existing = await Notifications.getPermissionsAsync();
  let finalStatus = existing.status;
  if (existing.status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }
  if (finalStatus !== "granted") return null;

  return getExpoPushTokenSafe();
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

/** Maximum notifications fetched for the in-app list. */
export const NOTIFICATIONS_PAGE_SIZE = 100;

export async function fetchNotifications(
  userId: string
): Promise<DbNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(NOTIFICATIONS_PAGE_SIZE);

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
 * Deactivates only THIS device's push token for the given user. Use on
 * sign-out so other devices the user is still signed into keep receiving
 * push, while this device stops getting notifications meant for the
 * previous account.
 *
 * Silently no-ops if permission was never granted (no token to look up).
 */
export async function deactivateCurrentDevicePushToken(
  userId: string,
): Promise<void> {
  if (Platform.OS === "web" || !Device.isDevice) return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return;

  const token = await getExpoPushTokenSafe();
  if (!token) return;

  const { error } = await supabase
    .from("user_push_tokens")
    .update({ is_active: false } as never)
    .eq("user_id", userId)
    .eq("expo_push_token", token);

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

// ── Navigation target resolution ─────────────────────────────────────────────
// Both push payloads (`NotificationNavigationData`) and DB rows
// (`DbNotification`) eventually want the same routing decision. Normalise both
// inputs into one shape and route via a single function — guarantees the in-app
// list, the push tap, and any future caller stay in lockstep.

type NormalizedNotification = {
  type?: string | null;
  propertyId?: string | null;
  keySetId?: string | null;
  checkoutId?: string | null;
  /** Optional explicit override path from a push payload. */
  path?: string | null;
};

function resolveTargetPath(n: NormalizedNotification): string | null {
  if (n.path && n.path.length > 0) return n.path;

  if (n.type === NOTIFICATION_TYPES.USER_REGISTRATION_REQUESTED) {
    return "/(app)/requests";
  }

  // Upcoming reservation — deep-link to the keyset so the agent can review it.
  // Falls through to generic keyset/property routing below.

  // Keyset detail lives under properties/keyset/[id] — NOT /(app)/keys/...
  if (n.keySetId) return `/(app)/properties/keyset/${n.keySetId}`;
  if (n.propertyId) return `/(app)/properties/${n.propertyId}`;
  if (n.checkoutId) return `/(app)/checkouts/${n.checkoutId}`;

  return null;
}

export function getNotificationTargetPath(
  data: NotificationNavigationData | null | undefined,
): string | null {
  if (!data) return null;
  const explicitPath =
    typeof data.path === "string"
      ? data.path
      : typeof data.route === "string"
        ? data.route
        : null;

  return resolveTargetPath({
    type: typeof data.type === "string" ? data.type : null,
    propertyId:
      (data.related_property_id as string | undefined) ??
      (data.relatedPropertyId as string | undefined) ??
      (data.property_id as string | undefined) ??
      (data.propertyId as string | undefined) ??
      null,
    keySetId:
      (data.related_key_set_id as string | undefined) ??
      (data.relatedKeySetId as string | undefined) ??
      (data.key_set_id as string | undefined) ??
      (data.keySetId as string | undefined) ??
      null,
    checkoutId:
      (data.related_checkout_id as string | undefined) ??
      (data.relatedCheckoutId as string | undefined) ??
      (data.checkout_id as string | undefined) ??
      (data.checkoutId as string | undefined) ??
      null,
    path: explicitPath,
  });
}

export function getNotificationRowTargetPath(
  notification: Pick<
    DbNotification,
    "type" | "related_property_id" | "related_key_set_id" | "related_checkout_id"
  >,
): string | null {
  return resolveTargetPath({
    type: notification.type,
    propertyId: notification.related_property_id,
    keySetId: notification.related_key_set_id,
    checkoutId: notification.related_checkout_id,
  });
}


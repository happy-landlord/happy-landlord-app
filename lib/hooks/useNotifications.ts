import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";

import type { DbNotification } from "@/types/database";
import { QUERY_KEYS } from "@/lib/query/keys";
import { invalidateNotifications } from "@/lib/query/query";
import { supabase } from "@/lib/supabase/client";
import { useLockStore } from "@/lib/state/lockStore";
import { useCurrentUserId } from "@/lib/hooks/useSession";
import {
  createNotification,
  deactivateAllPushTokens,
  fetchNotifications,
  fetchPushStatus,
  fetchUnreadNotificationCount,
  getNotificationTargetPath,
  markAllNotificationsRead,
  markNotificationRead,
  requestExpoPushToken,
  saveUserPushToken,
  sendPushNotification,
  type PushStatus,
} from "@/lib/services/notifications.service";

// ── Notifications list / unread count ────────────────────────────────────────

export function useNotifications() {
  const userId = useCurrentUserId();
  return useQuery<DbNotification[], Error>({
    queryKey: userId
      ? QUERY_KEYS.notifications.all(userId)
      : ["notifications", "none"],
    queryFn: () => fetchNotifications(userId!),
    enabled: Boolean(userId),
  });
}

export function useUnreadNotificationCount() {
  const userId = useCurrentUserId();
  return useQuery<number, Error>({
    queryKey: userId
      ? QUERY_KEYS.notifications.unreadCount(userId)
      : ["notifications", "none", "unreadCount"],
    queryFn: () => fetchUnreadNotificationCount(userId!),
    enabled: Boolean(userId),
  });
}

export function useMarkNotificationRead() {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: markNotificationRead,

    // ── Optimistic update: patch cache immediately so the card changes
    //    without waiting for a server response or triggering a refetch.
    onMutate: async (notificationId) => {
      if (!userId) return;

      // Cancel any in-flight refetches so they don't overwrite the optimistic data
      await queryClient.cancelQueries({
        queryKey: QUERY_KEYS.notifications.all(userId),
      });

      // Snapshot for rollback
      const previousList = queryClient.getQueryData<DbNotification[]>(
        QUERY_KEYS.notifications.all(userId),
      );
      const previousCount = queryClient.getQueryData<number>(
        QUERY_KEYS.notifications.unreadCount(userId),
      );

      // Patch the notification list: mark the tapped item read
      queryClient.setQueryData<DbNotification[]>(
        QUERY_KEYS.notifications.all(userId),
        (old) =>
          old?.map((n) =>
            n.id === notificationId
              ? { ...n, read_at: new Date().toISOString() }
              : n,
          ) ?? [],
      );

      // Decrement unread count
      queryClient.setQueryData<number>(
        QUERY_KEYS.notifications.unreadCount(userId),
        (old) => Math.max(0, (old ?? 1) - 1),
      );

      return { previousList, previousCount };
    },

    // ── Rollback on server error
    onError: (_err, _id, context) => {
      if (!userId) return;
      const ctx = context as
        | { previousList?: DbNotification[]; previousCount?: number }
        | undefined;

      if (ctx?.previousList !== undefined) {
        queryClient.setQueryData(
          QUERY_KEYS.notifications.all(userId),
          ctx.previousList,
        );
      }
      if (ctx?.previousCount !== undefined) {
        queryClient.setQueryData(
          QUERY_KEYS.notifications.unreadCount(userId),
          ctx.previousCount,
        );
      }
    },

    // ── Sync with server after settle (success or error)
    onSettled: () => {
      if (!userId) return;
      invalidateNotifications(queryClient, userId);
    },
  });
}

// ── Push registration / realtime / foreground listeners ──────────────────────

export function useRegisterPushToken() {
  const userId = useCurrentUserId();
  useEffect(() => {
    let cancelled = false;

    async function register() {
      if (!userId) return;
      try {
        const token = await requestExpoPushToken();
        if (!token || cancelled) return;
        await saveUserPushToken(userId, token);
      } catch (error) {
        console.warn("Push token registration failed:", error);
      }
    }

    register();

    return () => {
      cancelled = true;
    };
  }, [userId]);
}

export function useNotificationRealtime() {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const invalidate = () => invalidateNotifications(queryClient, userId);

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_user_id=eq.${userId}`,
        },
        invalidate,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);
}

export function useNotificationResponseNavigation() {
  const router = useRouter();
  const isLocked = useLockStore((state) => state.isLocked);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        // Never navigate into the app while the biometric lock screen is showing
        if (isLocked) return;

        const path = getNotificationTargetPath(
          response.notification.request.content.data ?? null,
        );

        if (path) {
          router.push(path as never);
        } else {
          router.push("/(app)/notifications" as never);
        }
      },
    );

    return () => subscription.remove();
  }, [router, isLocked]);
}

/**
 * Listens for notifications received while the app is in the foreground and
 * refreshes the notification list / unread count for the current user.
 */
export function useForegroundNotificationListener() {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const subscription = Notifications.addNotificationReceivedListener(() => {
      invalidateNotifications(queryClient, userId);
    });

    return () => subscription.remove();
  }, [queryClient, userId]);
}

// ── Admin test ───────────────────────────────────────────────────────────────

type AdminTestNotificationParams = {
  recipientUserId: string;
  title: string;
  body: string;
  type: string;
};

/**
 * Admin-only hook: creates a test notification row via RPC then fires the
 * `send-push-notification` Edge Function with the returned id.
 */
export function useAdminSendTestNotification() {
  return useMutation<string, Error, AdminTestNotificationParams>({
    mutationFn: async (params) => {
      const notificationId = await createNotification({
        recipientUserId: params.recipientUserId,
        title: params.title,
        body: params.body,
        type: params.type,
      });
      // Fire-and-forget the push; a failure here should not fail the whole test
      try {
        await sendPushNotification(notificationId);
      } catch (pushError) {
        console.warn(
          "Push dispatch failed (notification row was created):",
          pushError,
        );
      }
      return notificationId;
    },
  });
}

// ── Push settings hooks ──────────────────────────────────────────────────────

/** Fetches OS permission status + whether the user has an active DB token. */
export function usePushStatus() {
  const userId = useCurrentUserId();
  return useQuery<PushStatus, Error>({
    queryKey: userId
      ? QUERY_KEYS.notifications.pushStatus(userId)
      : ["notifications", "none", "pushStatus"],
    queryFn: () => fetchPushStatus(userId!),
    enabled: Boolean(userId),
    staleTime: 0, // always re-check on focus so it reflects system changes
  });
}

/**
 * Toggles push notifications on/off for the current user.
 *   ON  → request OS permission if needed, then upsert active token
 *   OFF → deactivate all tokens in DB
 */
export function useTogglePush() {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  return useMutation<void, Error, boolean>({
    mutationFn: async (enable) => {
      if (!userId) return;
      if (enable) {
        const token = await requestExpoPushToken();
        if (token) await saveUserPushToken(userId, token);
      } else {
        await deactivateAllPushTokens(userId);
      }
    },
    onSettled: () => {
      if (!userId) return;
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.notifications.pushStatus(userId),
      });
    },
  });
}

/** Marks every unread notification for this user as read. */
export function useMarkAllNotificationsRead() {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: () => {
      if (!userId) return Promise.resolve();
      return markAllNotificationsRead(userId);
    },
    onSuccess: () => {
      if (!userId) return;
      invalidateNotifications(queryClient, userId);
    },
  });
}

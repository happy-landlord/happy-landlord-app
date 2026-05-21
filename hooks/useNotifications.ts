import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";

import { QUERY_KEYS } from "@/constants/queryKeys";
import { supabase } from "@/lib/supabase";
import {
  createNotification,
  fetchNotifications,
  fetchUnreadNotificationCount,
  getNotificationTargetPath,
  markNotificationRead,
  requestExpoPushToken,
  saveUserPushToken,
  sendPushNotification,
  type AppNotification,
} from "@/services/notifications.service";

export function useNotifications(userId: string | undefined) {
  return useQuery<AppNotification[], Error>({
    queryKey: userId ? QUERY_KEYS.notifications.all(userId) : ["notifications", "none"],
    queryFn: () => fetchNotifications(userId!),
    enabled: Boolean(userId),
  });
}

export function useUnreadNotificationCount(userId: string | undefined) {
  return useQuery<number, Error>({
    queryKey: userId
      ? QUERY_KEYS.notifications.unreadCount(userId)
      : ["notifications", "none", "unreadCount"],
    queryFn: () => fetchUnreadNotificationCount(userId!),
    enabled: Boolean(userId),
  });
}

export function useMarkNotificationRead(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: markNotificationRead,

    // ── Optimistic update: patch cache immediately so the card changes
    //    without waiting for a server response or triggering a refetch.
    onMutate: async (notificationId) => {
      if (!userId) return;

      // Cancel any in-flight refetches so they don't overwrite the optimistic data
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.notifications.all(userId) });

      // Snapshot for rollback
      const previousList = queryClient.getQueryData<AppNotification[]>(
        QUERY_KEYS.notifications.all(userId)
      );
      const previousCount = queryClient.getQueryData<number>(
        QUERY_KEYS.notifications.unreadCount(userId)
      );

      // Patch the notification list: mark the tapped item read
      queryClient.setQueryData<AppNotification[]>(
        QUERY_KEYS.notifications.all(userId),
        (old) =>
          old?.map((n) =>
            n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
          ) ?? []
      );

      // Decrement unread count
      queryClient.setQueryData<number>(
        QUERY_KEYS.notifications.unreadCount(userId),
        (old) => Math.max(0, (old ?? 1) - 1)
      );

      return { previousList, previousCount };
    },

    // ── Rollback on server error
    onError: (_err, _id, context) => {
      if (!userId) return;
      const ctx = context as
        | { previousList?: AppNotification[]; previousCount?: number }
        | undefined;

      if (ctx?.previousList !== undefined) {
        queryClient.setQueryData(QUERY_KEYS.notifications.all(userId), ctx.previousList);
      }
      if (ctx?.previousCount !== undefined) {
        queryClient.setQueryData(
          QUERY_KEYS.notifications.unreadCount(userId),
          ctx.previousCount
        );
      }
    },

    // ── Sync with server after settle (success or error)
    onSettled: () => {
      if (!userId) return;
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications.all(userId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications.unreadCount(userId) });
    },
  });
}

export function useRegisterPushToken(userId: string | undefined) {
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

export function useNotificationRealtime(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications.all(userId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications.unreadCount(userId) });
    };

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
        invalidate
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);
}

export function useNotificationResponseNavigation() {
  const router = useRouter();

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const path = getNotificationTargetPath(
        response.notification.request.content.data ?? null
      );

      if (path) {
        router.push(path as never);
      } else {
        router.push("/(app)/notifications" as never);
      }
    });

    return () => subscription.remove();
  }, [router]);
}

/**
 * Listens for notifications received while the app is in the foreground and
 * refreshes the notification list / unread count for the given user.
 */
export function useForegroundNotificationListener(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const subscription = Notifications.addNotificationReceivedListener(() => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications.all(userId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications.unreadCount(userId) });
    });

    return () => subscription.remove();
  }, [queryClient, userId]);
}

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
        console.warn("Push dispatch failed (notification row was created):", pushError);
      }
      return notificationId;
    },
  });
}


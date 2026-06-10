import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";

import type { DbNotification } from "@/types";
import { QUERY_KEYS, invalidateNotifications } from "@/lib/query";
import { supabase } from "@/lib/supabase";
import { useLockStore } from "@/lib/state";
import { useCurrentUserId } from "@/lib/hooks/useSession";
import { logger } from "@/lib/utils/logger";
import {
  createNotification,
  deactivateAllPushTokens,
  fetchNotifications,
  fetchPushStatus,
  fetchUnreadNotificationCount,
  getExistingExpoPushToken,
  getNotificationTargetPath,
  markAllNotificationsRead,
  markNotificationRead,
  requestExpoPushToken,
  saveUserPushToken,
  sendPushNotification,
  type PushStatus,
} from "@/lib/services";

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

// ── Mark read mutations ──────────────────────────────────────────────────────

type MarkReadContext = {
  previousList?: DbNotification[];
  previousCount?: number;
};

export function useMarkNotificationRead() {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  return useMutation<void, Error, string, MarkReadContext>({
    mutationFn: markNotificationRead,

    // Optimistic patch: cache flips to "read" instantly.
    onMutate: async (notificationId): Promise<MarkReadContext> => {
      if (!userId) return {};

      await queryClient.cancelQueries({
        queryKey: QUERY_KEYS.notifications.all(userId),
      });

      const previousList = queryClient.getQueryData<DbNotification[]>(
        QUERY_KEYS.notifications.all(userId),
      );
      const previousCount = queryClient.getQueryData<number>(
        QUERY_KEYS.notifications.unreadCount(userId),
      );

      queryClient.setQueryData<DbNotification[]>(
        QUERY_KEYS.notifications.all(userId),
        (old) =>
          old?.map((n) =>
            n.id === notificationId
              ? { ...n, read_at: new Date().toISOString() }
              : n,
          ) ?? [],
      );

      queryClient.setQueryData<number>(
        QUERY_KEYS.notifications.unreadCount(userId),
        (old) => Math.max(0, (old ?? 1) - 1),
      );

      return { previousList, previousCount };
    },

    // Roll back AND invalidate only when the server rejected us.
    onError: (_err, _id, context) => {
      if (!userId || !context) return;
      if (context.previousList !== undefined) {
        queryClient.setQueryData(
          QUERY_KEYS.notifications.all(userId),
          context.previousList,
        );
      }
      if (context.previousCount !== undefined) {
        queryClient.setQueryData(
          QUERY_KEYS.notifications.unreadCount(userId),
          context.previousCount,
        );
      }
      invalidateNotifications(queryClient, userId);
    },
    // No onSettled invalidation on success — the optimistic patch already
    // matches the server, so refetching would just flicker the cards.
  });
}

/** Marks every unread notification for this user as read. */
export function useMarkAllNotificationsRead() {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  return useMutation<void, Error, void, MarkReadContext>({
    mutationFn: () => {
      if (!userId) return Promise.resolve();
      return markAllNotificationsRead(userId);
    },

    // Optimistic patch — flip every unread row + zero the badge instantly.
    onMutate: async (): Promise<MarkReadContext> => {
      if (!userId) return {};

      await queryClient.cancelQueries({
        queryKey: QUERY_KEYS.notifications.all(userId),
      });

      const previousList = queryClient.getQueryData<DbNotification[]>(
        QUERY_KEYS.notifications.all(userId),
      );
      const previousCount = queryClient.getQueryData<number>(
        QUERY_KEYS.notifications.unreadCount(userId),
      );

      const now = new Date().toISOString();
      queryClient.setQueryData<DbNotification[]>(
        QUERY_KEYS.notifications.all(userId),
        (old) =>
          old?.map((n) => (n.read_at ? n : { ...n, read_at: now })) ?? [],
      );
      queryClient.setQueryData<number>(
        QUERY_KEYS.notifications.unreadCount(userId),
        0,
      );

      return { previousList, previousCount };
    },

    onError: (_err, _vars, context) => {
      if (!userId || !context) return;
      if (context.previousList !== undefined) {
        queryClient.setQueryData(
          QUERY_KEYS.notifications.all(userId),
          context.previousList,
        );
      }
      if (context.previousCount !== undefined) {
        queryClient.setQueryData(
          QUERY_KEYS.notifications.unreadCount(userId),
          context.previousCount,
        );
      }
      invalidateNotifications(queryClient, userId);
    },
  });
}

// ── Push registration / realtime / foreground listeners ──────────────────────

/**
 * Silent registration: if the OS has *already* granted push permission, refresh
 * the active token in the DB. **Never prompts.** The first-time prompt is
 * deferred to an explicit user action (the Settings → Push toggle).
 */
export function useRegisterPushToken() {
  const userId = useCurrentUserId();
  useEffect(() => {
    let cancelled = false;

    async function register() {
      if (!userId) return;
      try {
        const token = await getExistingExpoPushToken();
        if (!token || cancelled) return;
        await saveUserPushToken(userId, token);
      } catch (error) {
        logger.warn("Silent push token refresh failed", {
          error: String(error),
        });
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
 * Single entry-point for the notification lifecycle hooks that should run
 * once per authenticated app session. Mount this in the top-level
 * authenticated layout instead of wiring each hook individually.
 */
export function useNotificationsLifecycle() {
  useRegisterPushToken();
  useNotificationRealtime();
  useNotificationResponseNavigation();
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
        logger.warn("Push dispatch failed (notification row was created)", {
          error: String(pushError),
        });
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

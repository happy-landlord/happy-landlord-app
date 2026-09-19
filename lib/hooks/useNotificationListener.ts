import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { getNotificationTargetPath } from "@/lib/services/notifications.service";
import { logger } from "@/lib/utils/logger";

/**
 * Hook to handle incoming notifications and notification taps.
 * Routes to appropriate screen based on notification type and data.
 * Also handles initial notification if app was launched by tapping a notification.
 */
export function useNotificationListener() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    // Handle notification that launched the app (app was closed when user tapped notification)
    try {
      const notification = Notifications.getLastNotificationResponse();
      if (!isMounted) return;
      if (notification) {
        const { data } = notification.notification.request.content;
        const targetPath = getNotificationTargetPath(data);

        logger.info("Handling initial notification from closed app", { targetPath });

        if (targetPath) {
          router.push(targetPath as any);
        }
      }
    } catch (error) {
      logger.warn("Error handling initial notification", { error: String(error) });
    }

    // Listen for notifications when app is in foreground
    const foregroundSubscription =
      Notifications.addNotificationReceivedListener((notification) => {
        logger.info("Foreground notification received", {
          type: notification.request.content.data?.type,
        });
      });

    // Listen for notification taps
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const { data } = response.notification.request.content;
        const targetPath = getNotificationTargetPath(data);

        logger.info("Notification tapped", { targetPath });

        if (targetPath) {
          router.push(targetPath as any);
        }
      });

    return () => {
      isMounted = false;
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }, [router]);
}




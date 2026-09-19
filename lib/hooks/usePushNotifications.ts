import { useEffect } from "react";
import { useCurrentUserId } from "./useSession";
import {
  requestExpoPushToken,
  saveUserPushToken,
  getExistingExpoPushToken,
} from "@/lib/services/notifications.service";
import { logger } from "@/lib/utils/logger";

/**
 * Hook to register Expo push token when user logs in.
 * Silently attempts to register the token without prompting.
 */
export function usePushTokenRegistration() {
  const userId = useCurrentUserId();

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;

    const registerToken = async () => {
      try {
        // Attempt to get existing token without prompting
        const existingToken = await getExistingExpoPushToken();
        if (!isMounted) return;

        if (existingToken) {
          await saveUserPushToken(userId, existingToken);
        }
      } catch (error) {
        logger.warn("Failed to register push token on login", {
          error: String(error),
        });
      }
    };

    registerToken();

    return () => {
      isMounted = false;
    };
  }, [userId]);
}


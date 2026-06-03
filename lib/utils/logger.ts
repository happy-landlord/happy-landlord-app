/**
 * Structured logger for Happy Landlord.
 *
 * - In dev builds: proxies to the relevant `console.*` method so Metro's
 *   LogBox and terminal output work as expected.
 * - In production builds: adds a Sentry breadcrumb so the event trail is
 *   visible when a crash report arrives. Errors are additionally captured
 *   as Sentry exceptions so they appear in the Issues list.
 *
 * Usage:
 *   import { logger } from "@/lib/utils";
 *   logger.warn("Auth callback error", { message: error.message });
 *   logger.error("Push token refresh failed", err);
 */

import * as Sentry from "@sentry/react-native";

type Extra = Record<string, unknown>;

function addBreadcrumb(
  level: Sentry.SeverityLevel,
  message: string,
  data?: Extra,
) {
  Sentry.addBreadcrumb({ level, message, data, type: "default" });
}

export const logger = {
  debug(message: string, data?: Extra) {
    if (__DEV__) {
      console.log(`[debug] ${message}`, data ?? "");
    } else {
      addBreadcrumb("debug", message, data);
    }
  },

  info(message: string, data?: Extra) {
    if (__DEV__) {
      console.log(`[info] ${message}`, data ?? "");
    } else {
      addBreadcrumb("info", message, data);
    }
  },

  warn(message: string, data?: Extra) {
    if (__DEV__) {
      console.warn(message, data ?? "");
    } else {
      addBreadcrumb("warning", message, data);
    }
  },

  /**
   * Logs an error. In production the error is both added as a breadcrumb
   * AND captured as a Sentry exception (so it appears in Issues, not just
   * the breadcrumb trail).
   */
  error(message: string, error?: unknown, data?: Extra) {
    if (__DEV__) {
      console.error(message, error ?? "", data ?? "");
    } else {
      addBreadcrumb("error", message, data);
      if (error instanceof Error) {
        Sentry.captureException(error, { extra: { context: message, ...data } });
      }
    }
  },
};

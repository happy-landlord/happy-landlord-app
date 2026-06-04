import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import * as Sentry from "@sentry/react-native";

import { getErrorMessage } from "@/lib/utils/errors";
import { showErrorToast } from "@/lib/utils/toast";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true for errors that are expected / should not surface a toast
 * (e.g. 401 Unauthorized — handled by the auth layer).
 */
function isSilentError(error: unknown): boolean {
  if (error && typeof error === "object" && "status" in error) {
    return (error as { status: number }).status === 401;
  }
  return false;
}

function handleGlobalError(
  error: unknown,
  context: { type: "query" | "mutation"; key?: readonly unknown[] },
) {
  if (isSilentError(error)) return;

  const message = getErrorMessage(error, "An unexpected error occurred.");

  // Surface a toast so the user always gets feedback.
  showErrorToast(
    context.type === "mutation" ? "Action failed" : "Failed to load data",
    message,
  );

  // Leave a breadcrumb in Sentry so the next captured event has context.
  Sentry.addBreadcrumb({
    category: "react-query",
    message,
    level: "error",
    data: {
      type: context.type,
      queryKey: context.key ? JSON.stringify(context.key) : undefined,
    },
  });
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) =>
      handleGlobalError(error, {
        type: "query",
        key: query.queryKey,
      }),
  }),
  mutationCache: new MutationCache({
    onError: (error) => handleGlobalError(error, { type: "mutation" }),
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      gcTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

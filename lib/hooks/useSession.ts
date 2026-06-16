import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";

import { QUERY_KEYS } from "@/lib/query";
import { FEATURES } from "@/constants";
import { useLockStore } from "@/lib/state";
import { supabase } from "@/lib/supabase";
import { deactivateCurrentDevicePushToken } from "@/lib/services";
import { logger } from "@/lib/utils/logger";

// ── Session query ────────────────────────────────────────────────────────────

const getSession = async (): Promise<Session | null> => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
};

export function useSession() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEYS.auth.session,
    queryFn: getSession,
  });

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      queryClient.setQueryData(QUERY_KEYS.auth.session, session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  return {
    session: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isAuthenticated: Boolean(query.data),
    error: query.error,
  };
}

// ── Convenience helpers ──────────────────────────────────────────────────────

// ── Change password ──────────────────────────────────────────────────────────

/**
 * Updates the authenticated user's password via Supabase.
 * The caller is responsible for validating that the two password fields match
 * before invoking `mutate`.
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: async (newPassword: string) => {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
  });
}

/** Returns the current Supabase user id, or undefined if not signed in. */
export function useCurrentUserId(): string | undefined {
  const { session } = useSession();
  return session?.user.id;
}

/**
 * Signs the user out, clears all cached queries, and resets biometric lock
 * state. Use this everywhere instead of calling `supabase.auth.signOut()`
 * directly so cleanup stays consistent.
 */
export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // Deactivate THIS device's push token BEFORE signing out, while we
      // still have a valid JWT for the row-level update. Failure here is
      // non-fatal — we still want sign-out to complete.
      try {
        const { data } = await supabase.auth.getSession();
        const userId = data.session?.user.id;
        if (userId) await deactivateCurrentDevicePushToken(userId);
      } catch (err) {
        logger.warn("Push token deactivation failed", { error: String(err) });
      }

      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // Run cleanup inside mutationFn so it executes even after the calling
      // component unmounts due to the SIGNED_OUT auth-state redirect.
      queryClient.clear();
      const lockStore = useLockStore.getState();
      lockStore.reset();
      // When biometrics is disabled globally, re-initialise immediately so
      // the next sign-in does not flash through an `initialized=false` state.
      if (!FEATURES.BIOMETRIC_LOCK) lockStore.initialize(false);
    },
  });
}

/**
 * Permanently deletes the authenticated user's account by calling the
 * `delete_account` SECURITY DEFINER RPC, which:
 *   1. Blocks deletion if the user has active checkouts (throws active_checkouts|...)
 *   2. Cancels active reservations
 *   3. Deletes push tokens
 *   4. Deletes notifications
 *   5. Anonymises key_holder records (preserves history)
 *   6. Deletes profile + auth user
 *
 * Push-token deactivation is intentionally NOT done on the FE — the RPC
 * handles it after the checkout guard passes, so tokens stay active if the
 * RPC rejects (e.g. unreturned keys).
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("delete_account" as never);

      if (error) throw error;

      // The auth user is already deleted server-side, so the /logout endpoint
      // may reject. Use scope:"local" to only clear the local session.
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch (err) {
        logger.warn("signOut after account deletion failed (expected)", {
          error: String(err),
        });
      }

      queryClient.clear();
      const lockStore = useLockStore.getState();
      lockStore.reset();
      if (!FEATURES.BIOMETRIC_LOCK) lockStore.initialize(false);
    },
  });
}


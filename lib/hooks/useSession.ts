import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";

import { QUERY_KEYS } from "@/lib/query";
import { FEATURES } from "@/constants";
import { useLockStore } from "@/lib/state";
import { supabase } from "@/lib/supabase";
import { deactivateCurrentDevicePushToken, fetchProfile, requestReactivation } from "@/lib/services";
import { logger } from "@/lib/utils/logger";
import type { DbProfile } from "@/types";

// ── Session query ────────────────────────────────────────────────────────────

/**
 * While a sign-in is being *verified* (status checked before we decide whether
 * the user is allowed in), the transient Supabase session must NOT propagate to
 * the query cache — otherwise the layouts would redirect a rejected/inactive
 * user into the app for a frame before useLogin signs them back out. useLogin
 * sets this flag around its sign-in + status check and writes the session
 * itself only for allowed users.
 */
let authSyncPaused = false;

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
      if (authSyncPaused) return;
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

// ── Sign in ──────────────────────────────────────────────────────────────────

export type LoginCredentials = { email: string; password: string };

export type LoginResult = {
  /** Resolved status after auth ("admin" substituted for approved admins). */
  status: "approved" | "admin" | "pending" | "rejected" | "inactive";
  /** Admin rejection note, present only for rejected accounts. */
  adminNote?: string | null;
};

/**
 * Writes the verified session + profile into the cache and arms the one-time
 * biometric skip (the password already proved identity). Shared by useLogin
 * and useRequestAccess so a granted sign-in renders without a refetch flash.
 */
function primeAuthCaches(
  queryClient: QueryClient,
  userId: string,
  session: Session | null,
  profile: DbProfile | null,
) {
  queryClient.setQueryData(QUERY_KEYS.auth.session, session);
  queryClient.setQueryData(QUERY_KEYS.auth.profile(userId), profile);
  if (FEATURES.BIOMETRIC_LOCK) {
    useLockStore.getState().setSkipBiometricOnce(true);
  }
}

/**
 * Signs the user in and checks their status:
 *  • approved / admin / pending → session kept, caches primed, caller navigates.
 *  • rejected / inactive        → signed out immediately (no session left open);
 *                                  returns status + any admin note so the login
 *                                  screen can show the warning banner without a
 *                                  session.
 */
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation<LoginResult, Error, LoginCredentials>({
    meta: { silentError: true },
    mutationFn: async ({ email, password }) => {
      // Pause auth→cache sync so the transient session from signInWithPassword
      // can't redirect a denied user into the app before we sign them out.
      authSyncPaused = true;
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;

        const profile = await fetchProfile(data.user.id);
        const status: LoginResult["status"] =
          profile?.role === "admin" ? "admin" : (profile?.status as LoginResult["status"]) ?? "pending";

        if (status === "rejected" || status === "inactive") {
          // Fetch the admin note while we still have a valid session, then
          // immediately sign out — no session is left open for denied users.
          const { data: req } = await supabase
            .from("registration_requests")
            .select("admin_note")
            .eq("profile_id", data.user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          await supabase.auth.signOut();
          queryClient.clear();
          return { status, adminNote: req?.admin_note };
        }

        // Approved / admin / pending — keep session and prime caches.
        primeAuthCaches(queryClient, data.user.id, data.session, profile);
        return { status };
      } finally {
        authSyncPaused = false;
      }
    },
  });
}

/**
 * Request access for a rejected/inactive account (which has no live session):
 * signs in with the supplied credentials, submits a fresh registration request
 * (flips the profile status → pending), primes the caches, and leaves the user
 * signed in so the layout routes them to the pending page.
 */
export function useRequestAccess() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, LoginCredentials>({
    meta: { silentError: true },
    mutationFn: async ({ email, password }) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      try {
        await requestReactivation(null);
      } catch (err) {
        // Don't leave a session open if the request couldn't be submitted.
        await supabase.auth.signOut();
        throw err;
      }

      const profile = await fetchProfile(data.user.id);
      primeAuthCaches(queryClient, data.user.id, data.session, profile);
    },
  });
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
 *   2. Cancels active reservations held by this user
 *   3. Anonymises key_holder rows (clears PII, preserves UUID + history)
 *   4. Deletes the auth.users row — profiles + push tokens + notifications
 *      cascade automatically via ON DELETE CASCADE
 *
 * Push-token deactivation is intentionally NOT done on the FE — cascades
 * handle cleanup after the checkout guard passes, so tokens stay active if
 * the RPC rejects (e.g. unreturned keys).
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


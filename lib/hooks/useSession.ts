import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";

import { QUERY_KEYS } from "@/lib/query";
import { FEATURES } from "@/constants";
import { useLockStore } from "@/lib/state";
import { supabase } from "@/lib/supabase";
import {
  deactivateCurrentDevicePushToken,
  fetchProfile,
  requestReactivation,
  sendPhoneOtp,
  verifyPhoneOtp,
} from "@/lib/services";
import { logger } from "@/lib/utils/logger";
import type { DbProfile } from "@/types";

// ── Session query ────────────────────────────────────────────────────────────

/**
 * While a sign-in is being *verified* (status checked before we decide whether
 * the user is allowed in), the transient Supabase session must NOT propagate to
 * the query cache — otherwise the layouts would redirect a rejected/inactive
 * user into the app for a frame before we sign them back out.
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

// ── OTP auth ─────────────────────────────────────────────────────────────────

export type OtpSendParams = {
  /** Raw phone number (will be normalised to E.164 internally). */
  phone: string;
  /** Optional: supply during registration so the profile trigger gets the name. */
  fullName?: string;
};

export type OtpVerifyMode = "login" | "register" | "reactivate";

export type OtpVerifyParams = {
  phone: string;
  token: string;
  mode: OtpVerifyMode;
};

export type LoginResult = {
  /** Resolved status after OTP verification. */
  status: "approved" | "admin" | "pending" | "rejected" | "inactive";
  /** Admin rejection note, present only for rejected accounts. */
  adminNote?: string | null;
};

/**
 * Writes the verified session + profile into the cache and arms the one-time
 * biometric skip. Shared by useVerifyOtp so a granted sign-in renders
 * without a refetch flash.
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
 * Sends an SMS OTP to the given phone number.
 * Use this before navigating to the OTP verification screen.
 */
export function useSendOtp() {
  return useMutation<void, Error, OtpSendParams>({
    meta: { silentError: true },
    mutationFn: ({ phone, fullName }) => sendPhoneOtp(phone, fullName),
  });
}

/**
 * Verifies an SMS OTP code and resolves the user's profile status:
 *
 *  mode="login"
 *    • approved / admin / pending → session kept, caches primed.
 *    • rejected / inactive        → signed out immediately; status + adminNote
 *                                   returned so the caller can show a banner.
 *
 *  mode="register"
 *    • Profile trigger creates a pending profile; caches primed.
 *
 *  mode="reactivate"
 *    • Calls requestReactivation() to flip status → pending, then primes caches.
 */
export function useVerifyOtp() {
  const queryClient = useQueryClient();

  return useMutation<LoginResult, Error, OtpVerifyParams>({
    meta: { silentError: true },
    mutationFn: async ({ phone, token, mode }) => {
      authSyncPaused = true;
      try {
        // Verify the OTP — establishes a Supabase session on success.
        await verifyPhoneOtp(phone, token);

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("No user returned after OTP verification.");

        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;

        // ── Reactivation ────────────────────────────────────────────────────
        if (mode === "reactivate") {
          const profile = await fetchProfile(user.id);
          await requestReactivation(null, profile?.full_name ?? null);
          primeAuthCaches(queryClient, user.id, session, profile);
          return { status: "pending" };
        }

        // ── Register / Login ─────────────────────────────────────────────────
        const profile = await fetchProfile(user.id);
        const status: LoginResult["status"] =
          profile?.role === "admin"
            ? "admin"
            : ((profile?.status as LoginResult["status"]) ?? "pending");

        // All statuses — prime caches; the app layout routes to the correct screen.
        // Rejected/inactive/pending users are directed to the holding page.
        primeAuthCaches(queryClient, user.id, session, profile);
        return { status };
      } finally {
        authSyncPaused = false;
      }
    },
  });
}

/**
 * Submits a reactivation request for the currently signed-in rejected/inactive
 * user and invalidates the profile cache so the holding page reflects the new status.
 */
export function useRequestReactivation() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    meta: { silentError: true },
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const profile = user ? await fetchProfile(user.id) : null;
      await requestReactivation(null, profile?.full_name ?? null);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["auth", "profile"] });
    },
  });
}

// ── Convenience helpers ──────────────────────────────────────────────────────

/** Returns the current Supabase user id, or undefined if not signed in. */
export function useCurrentUserId(): string | undefined {
  const { session } = useSession();
  return session?.user.id;
}

/**
 * Signs the user out, clears all cached queries, and resets biometric lock
 * state.
 */
export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const userId = data.session?.user.id;
        if (userId) await deactivateCurrentDevicePushToken(userId);
      } catch (err) {
        logger.warn("Push token deactivation failed", { error: String(err) });
      }

      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      queryClient.clear();
      const lockStore = useLockStore.getState();
      lockStore.reset();
      if (!FEATURES.BIOMETRIC_LOCK) lockStore.initialize(false, false);
    },
  });
}

/**
 * Permanently deletes the authenticated user's account via the
 * `delete_account` SECURITY DEFINER RPC.
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("delete_account" as never);
      if (error) throw error;

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
      if (!FEATURES.BIOMETRIC_LOCK) lockStore.initialize(false, false);
    },
  });
}

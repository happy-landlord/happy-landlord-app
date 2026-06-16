import { useEffect } from "react";
import { Redirect, Stack, useSegments } from "expo-router";
import * as Sentry from "@sentry/react-native";

import { AppHeader } from "@/components/AppHeader";
import { BiometricEnablePrompt } from "@/components/BiometricEnablePrompt";
import { LockScreen } from "@/components/LockScreen";
import { BrandedSplash } from "@/components/ui";
import {
  useSession,
  useProfile,
  useNotificationsLifecycle,
  useBiometricEnrolmentPrompt,
  useSignOut,
} from "@/lib/hooks";
import { FEATURES } from "@/constants";
import { useLockStore } from "@/lib/state";
import { isBiometricEnabled } from "@/lib/services";

export default function AppLayout() {
  const { isLoading: sessionLoading, isAuthenticated, session } = useSession();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const userId = profile?.id;
  const segments = useSegments();

  // ── Identify user in Sentry ─────────────────────────────────────────────
  useEffect(() => {
    if (profile) {
      Sentry.setUser({
        id: profile.id,
        email: session?.user.email,
        username: profile.full_name ?? undefined,
      });
    } else {
      Sentry.setUser(null);
    }
  }, [profile, session]);

  // ── Biometric lock state ────────────────────────────────────────────────
  const lockStore = useLockStore();
  const enrolmentPrompt = useBiometricEnrolmentPrompt();

  // Once we have a userId, read SecureStore to decide whether to lock.
  // Skip the gate when the user *just* authenticated via email/password.
  useEffect(() => {
    if (!userId || lockStore.initialized) return;

    if (!FEATURES.BIOMETRIC_LOCK) {
      lockStore.initialize(false);
      return;
    }

    if (lockStore.skipBiometricOnce) {
      // Fresh login — biometric already proven via password; don't lock again.
      // Consume the flag immediately so next cold-start behaves normally.
      useLockStore.getState().setSkipBiometricOnce(false);
      lockStore.initialize(false);
      return;
    }

    isBiometricEnabled(userId).then((enabled) => {
      lockStore.initialize(enabled);
    });
  }, [userId, lockStore.initialized, lockStore]);

  // ── Notification hooks (auto-read current user internally) ──────────────
  useNotificationsLifecycle();

  // ── Loading ─────────────────────────────────────────────────────────────
  // Only block on lock initialisation when biometrics is actually enabled.
  const isLockCheckPending =
    FEATURES.BIOMETRIC_LOCK &&
    isAuthenticated &&
    Boolean(userId) &&
    !lockStore.initialized;

  const isLoading =
    sessionLoading || (isAuthenticated && profileLoading) || isLockCheckPending;

  // ── Status gate ─────────────────────────────────────────────────────────
  // Admins always have access; everyone else is gated by profile.status.
  const status = profile?.role === "admin" ? "approved" : profile?.status;
  const currentScreen = segments[segments.length - 1] as string | undefined;
  const onPending = currentScreen === "pending";
  const isDenied = status === "rejected" || status === "inactive";

  // Approved users deactivated/rejected mid-session: sign them out so they
  // can't keep using a stale session (and so the auth layout doesn't bounce
  // them straight back here, which would loop). Normal denied sign-ins never
  // reach this layout — useLogin signs them out before a session is kept.
  const signOut = useSignOut();
  useEffect(() => {
    if (!isLoading && isAuthenticated && isDenied && !signOut.isPending) {
      signOut.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isAuthenticated, isDenied]);

  if (isLoading) {
    return <BrandedSplash message="Preparing your workspace…" />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  // ── Lock gate: render only the lock screen until the user authenticates ─
  if (FEATURES.BIOMETRIC_LOCK && lockStore.isLocked) {
    return (
      <LockScreen
        userName={profile?.full_name}
        userEmail={session?.user.email}
      />
    );
  }

  // ── Status gate (declarative — no dashboard flash, no redirect races) ────
  if (isDenied) {
    // Signing out (effect above); hold on a splash until the session clears,
    // then the !isAuthenticated branch redirects to login.
    return <BrandedSplash message="Signing out…" />;
  }
  if (status === "pending") {
    if (!onPending) return <Redirect href="/(app)/pending" />;
  } else if (onPending) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return (
    <>
      <Stack screenOptions={{ header: () => <AppHeader /> }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="scan"
          options={{ headerShown: false, presentation: "fullScreenModal" }}
        />
        <Stack.Screen name="properties/add" options={{ headerShown: false }} />
        <Stack.Screen name="properties/edit/[id]" />
        <Stack.Screen name="properties/[id]" />
        <Stack.Screen name="properties/keyset/[id]" />
        <Stack.Screen name="properties/keyset/edit/[id]" />
        <Stack.Screen name="checkouts/[id]" />
        <Stack.Screen name="agents" options={{ title: "Agents" }} />
        <Stack.Screen
          name="notifications"
          options={{ title: "Notifications" }}
        />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
        <Stack.Screen name="help" options={{ title: "Help" }} />
        <Stack.Screen name="pending" options={{ headerShown: false }} />
      </Stack>

      {/* First-login biometric enrolment prompt — only when feature is enabled */}
      {FEATURES.BIOMETRIC_LOCK && (
        <BiometricEnablePrompt
          visible={enrolmentPrompt.visible}
          biometricLabel={enrolmentPrompt.biometricLabel}
          onEnable={enrolmentPrompt.onEnable}
          onDismiss={enrolmentPrompt.onDismiss}
        />
      )}
    </>
  );
}

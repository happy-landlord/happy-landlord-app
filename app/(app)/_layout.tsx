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
  useBiometricLockGate,
} from "@/lib/hooks";
import { FEATURES } from "@/constants";

export default function AppLayout() {
  const { isLoading: sessionLoading, isAuthenticated, session } = useSession();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const userId = profile?.id;

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

  // ── Biometric lock + first-login enrolment prompt ───────────────────────
  const lockGate = useBiometricLockGate(userId, isAuthenticated);
  const enrolmentPrompt = useBiometricEnrolmentPrompt();

  // ── Notification hooks (auto-read current user internally) ──────────────
  useNotificationsLifecycle();

  // ── Loading ─────────────────────────────────────────────────────────────
  const isLoading =
    sessionLoading ||
    (isAuthenticated && profileLoading) ||
    lockGate.isInitializing;

  // ── Status gate ─────────────────────────────────────────────────────────
  // Admins always have access; everyone else is gated by profile.status.
  const status = profile?.role === "admin" ? "approved" : profile?.status;
  const segments = useSegments();
  const currentScreen = segments[segments.length - 1] as string | undefined;
  const onHolding = currentScreen === "holding";
  const isHolding = status === "pending" || status === "rejected" || status === "inactive";

  if (isLoading) {
    return <BrandedSplash message="Preparing your workspace…" />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  // ── Lock gate: render only the lock screen until the user authenticates ─
  if (FEATURES.BIOMETRIC_LOCK && lockGate.isLocked) {
    return (
      <LockScreen
        userName={profile?.full_name}
        userEmail={session?.user.email}
      />
    );
  }

  // ── Status gate ────────────────────────────────────────────────────────────
  if (isHolding) {
    if (!onHolding) return <Redirect href="/(app)/holding" />;
  } else if (onHolding) {
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
        <Stack.Screen name="holding" options={{ headerShown: false }} />
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

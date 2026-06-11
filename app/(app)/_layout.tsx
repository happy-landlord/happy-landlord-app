import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect, Stack, useRouter, useSegments } from "expo-router";
import * as Sentry from "@sentry/react-native";

import { AppHeader } from "@/components/AppHeader";
import { BiometricEnablePrompt } from "@/components/BiometricEnablePrompt";
import { LockScreen } from "@/components/LockScreen";
import { useSession, useProfile, useNotificationsLifecycle, useBiometricEnrolmentPrompt } from "@/lib/hooks";
import { FEATURES, theme } from "@/constants";
import { useLockStore } from "@/lib/state";
import { isBiometricEnabled } from "@/lib/services";

export default function AppLayout() {
  const { isLoading: sessionLoading, isAuthenticated, session } = useSession();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const userId = profile?.id;
  const router = useRouter();
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

  const currentScreen = segments[segments.length - 1] as string | undefined;
  const isOnStatusScreen =
    currentScreen === "pending" || currentScreen === "rejected";

  useEffect(() => {
    if (isLoading || !isAuthenticated || !profile) return;

    const isAdmin = profile.role === "admin";
    const needsStatusScreen =
      !isAdmin &&
      (profile.status === "pending" ||
        profile.status === "rejected" ||
        profile.status === "inactive");

    if (isOnStatusScreen) {
      if (!needsStatusScreen) router.replace("/(app)/(tabs)");
      return;
    }

    if (needsStatusScreen) {
      if (profile.status === "pending") router.replace("/(app)/pending");
      else router.replace("/(app)/rejected");
    }
  }, [isLoading, isAuthenticated, profile, isOnStatusScreen, router]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
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
        <Stack.Screen name="properties/[id]/keysets/[keysetId]" />
        <Stack.Screen name="checkouts/[id]" />
        <Stack.Screen name="agents" options={{ title: "Agents" }} />
        <Stack.Screen
          name="notifications"
          options={{ title: "Notifications" }}
        />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
        <Stack.Screen name="help" options={{ title: "Help" }} />
        <Stack.Screen name="pending" options={{ headerShown: false }} />
        <Stack.Screen name="rejected" options={{ headerShown: false }} />
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
